import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/network/api_client.dart';
import '../../../create/data/datasources/create_remote_ds.dart';
import '../../../create/data/models/brand_preset.dart';
import '../../../create/data/models/requests.dart';
import '../../../create/data/models/task_status.dart';
import '../widgets/video_generation_section.dart';

class CreateContentPage extends StatefulWidget {
  const CreateContentPage({super.key});
  @override
  State<CreateContentPage> createState() => _CreateContentPageState();
}

class _CreateContentPageState extends State<CreateContentPage> {
  late final CreateRemoteDataSource _ds;

  final _ideaCtrl = TextEditingController();
  final _captionCtrl = TextEditingController();
  final _ctaCtrl = TextEditingController();

  final _platforms = const ['instagram', 'tiktok'];
  final _tones = const ['Playful', 'Professional', 'Casual', 'Elegant'];

  String _platform = 'instagram';
  String _tone = 'Playful';
  List<String> _hashtags = ['AddisAbebaCafe', 'EthiopianCoffee'];

  // Loading/error per section for clarity
  bool _captionLoading = false;
  String? _captionError;

  bool _imageLoading = false;
  String? _imageError;
  String? _imageUrl;

  // Video is handled by VideoGenerationSection; we just pass inputs.
  final GlobalKey<VideoGenerationSectionState> _videoKey =
      GlobalKey<VideoGenerationSectionState>();

  @override
  void initState() {
    super.initState();
    _ds = CreateRemoteDataSource(ApiClient());
    _ideaCtrl.text = '15s TikTok for wildlife conservation ad';
    _ctaCtrl.text = 'call and reserve';
  }

  @override
  void dispose() {
    _ideaCtrl.dispose();
    _captionCtrl.dispose();
    _ctaCtrl.dispose();
    super.dispose();
  }

  BrandPreset _brand() => BrandPreset(
        name: "Wildlife",
        colors: ["#FBBF24", "#0D2A4B"],
        tone: _tone,
        defaultHashtags: _hashtags,
        footerText: "Wildlife 2025",
      );

  String _aspectForPlatform({required bool video}) {
    if (_platform == 'tiktok') return "9:16";
    if (video) return "9:16";
    return "1:1";
  }

  // ---------------- STEP 1: CAPTION ----------------

  Future<void> _createCaption() async {
    setState(() {
      _captionLoading = true;
      _captionError = null;
    });

    final idea = _ideaCtrl.text.trim().isEmpty
        ? "15s TikTok for wildlife conservation ad"
        : _ideaCtrl.text.trim();

    try {
      final caption = await _ds.generateCaption(
        CaptionRequest(
          idea: idea,
          brandPresets: _brand(),
          platform: _platform,
        ),
      );
      setState(() {
        _captionCtrl.text = caption;
      });
    } catch (e) {
      setState(() {
        _captionError = _extractError(e);
      });
    } finally {
      if (mounted) {
        setState(() => _captionLoading = false);
      }
    }
  }

  // ---------------- STEP 2: IMAGE ----------------

  Future<void> _generateImage() async {
    setState(() {
      _imageLoading = true;
      _imageError = null;
      _imageUrl = null;
    });

    final idea = _ideaCtrl.text.trim().isEmpty
        ? "15s TikTok for wildlife conservation ad"
        : _ideaCtrl.text.trim();

    try {
      // 1) Generate prompt
      final generatedPrompt = await _ds.startImageGeneration(
        ImageGenerationRequest(
          prompt: idea,
          style: "realistic",
          aspectRatio: _aspectForPlatform(video: false),
          brandPresets: _brand(),
          platform: _platform,
        ),
      );

      // 2) Render image -> task id
      final renderTaskId = await _ds.startImageRender(
        promptUsed: generatedPrompt,
        style: "realistic",
        aspectRatio: _aspectForPlatform(video: false),
        platform: _platform,
      );

      // 3) Poll status
      final TaskStatus status = await _pollTaskUntilDone(
        renderTaskId,
        fetch: _ds.getImageStatus,
        timeout: const Duration(minutes: 5),
        interval: const Duration(seconds: 2),
      );

      final s = status.status.trim().toUpperCase();
      if (s == 'SUCCESS' || s == 'SUCCEEDED' || s == 'READY') {
        final url = status.url;
        if (url == null || url.isEmpty) {
          throw Exception("Image success but no URL");
        }
        setState(() {
          _imageUrl = url;
        });
      } else {
        throw Exception(status.error ?? "Image render failed (status=$s)");
      }
    } catch (e) {
      setState(() {
        _imageError = _extractError(e);
      });
    } finally {
      if (mounted) {
        setState(() => _imageLoading = false);
      }
    }
  }

  // ---------------- Shared helpers ----------------

  String _extractError(Object e) {
    if (e is DioException) {
      final data = e.response?.data;
      if (data is Map && data['detail'] != null) return data['detail'].toString();
      return e.message ?? e.toString();
    }
    return e.toString();
  }

  Future<TaskStatus> _pollTaskUntilDone(
    String taskId, {
    required Future<TaskStatus> Function(String id) fetch,
    Duration timeout = const Duration(minutes: 10),
    Duration interval = const Duration(seconds: 2),
  }) async {
    final deadline = DateTime.now().add(timeout);
    TaskStatus status = await fetch(taskId);

    while (mounted) {
      final s = status.status.trim().toUpperCase();
      if (s == 'READY' || s == 'FAILED' || s == 'SUCCESS' || s == 'SUCCEEDED') break;
      if (DateTime.now().isAfter(deadline)) {
        throw Exception("Timed out waiting for task $taskId");
      }
      await Future.delayed(interval);
      status = await fetch(taskId);
    }
    return status;
  }

  Future<void> _exportClipboard() async {
    final text = StringBuffer()
      ..writeln(_captionCtrl.text)
      ..writeln()
      ..writeln(_hashtags.map((h) => '#$h').join(' '));
    await Clipboard.setData(ClipboardData(text: text.toString()));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Copied caption + hashtags')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final toneChips = Wrap(
      spacing: 8,
      runSpacing: 8,
      children: _tones.map((t) {
        final selected = _tone == t;
        return ChoiceChip(
          label: Text(t),
          selected: selected,
          onSelected: (_) => setState(() => _tone = t),
        );
      }).toList(),
    );

    return Scaffold(
      appBar: AppBar(title: const Text('Create Content')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _HeaderBrand(),

          // STEP 1 — CAPTION
          _StepCard(
            step: 1,
            title: 'Create caption',
            subtitle:
                'We’ll write a caption from your idea. Then use it to inform your image or video.',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Inputs
                TextField(
                  controller: _ideaCtrl,
                  maxLines: 3,
                  decoration: InputDecoration(
                    labelText: 'Idea',
                    hintText:
                        'e.g., 15s TikTok for wildlife conservation ad',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    filled: true,
                    fillColor: Colors.grey.shade100,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _platform,
                        decoration: const InputDecoration(
                            labelText: 'Platform', border: OutlineInputBorder()),
                        items: _platforms
                            .map((p) => DropdownMenuItem(value: p, child: Text(p)))
                            .toList(),
                        onChanged: (v) => setState(() => _platform = v ?? 'instagram'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        controller: _ctaCtrl,
                        decoration: const InputDecoration(
                          labelText: 'CTA (video only)',
                          hintText: 'call and reserve',
                          border: OutlineInputBorder(),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const Text('Tone'),
                const SizedBox(height: 6),
                toneChips,
                const SizedBox(height: 12),

                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    icon: const Icon(Icons.chat_bubble_outline),
                    label: Text(_captionLoading ? 'Creating…' : 'Create caption'),
                    onPressed: _captionLoading ? null : _createCaption,
                  ),
                ),

                if (_captionError != null) ...[
                  const SizedBox(height: 12),
                  _ErrorBanner(_captionError!),
                ],

                if (_captionLoading) ...[
                  const SizedBox(height: 16),
                  const Center(child: CircularProgressIndicator()),
                ],

                if (!_captionLoading && _captionCtrl.text.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  const Text('Generated caption',
                      style: TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  Container(
                    decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.all(12),
                    child: TextField(
                      controller: _captionCtrl,
                      maxLines: 8,
                      decoration: const InputDecoration(border: InputBorder.none),
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text('# Hashtags',
                      style: TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children:
                        _hashtags.map((h) => Chip(label: Text('#$h'))).toList(),
                  ),
                  const SizedBox(height: 8),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: OutlinedButton.icon(
                      onPressed: _exportClipboard,
                      icon: const Icon(Icons.copy_all),
                      label: const Text('Copy caption & hashtags'),
                    ),
                  ),
                ],
              ],
            ),
          ),

          // STEP 2 — IMAGE
          _StepCard(
            step: 2,
            title: 'Generate image',
            subtitle:
                'Create a branded image from your idea. Aspect ratio is chosen from the platform.',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    icon: const Icon(Icons.image_outlined),
                    label: Text(_imageLoading ? 'Rendering…' : 'Generate image'),
                    onPressed: _imageLoading ? null : _generateImage,
                  ),
                ),
                if (_imageError != null) ...[
                  const SizedBox(height: 12),
                  _ErrorBanner(_imageError!),
                ],
                if (_imageLoading) ...[
                  const SizedBox(height: 16),
                  const Center(child: CircularProgressIndicator()),
                ],
                if (!_imageLoading && _imageUrl != null) ...[
                  const SizedBox(height: 16),
                  const Text('Image preview',
                      style: TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.network(
                      _imageUrl!,
                      width: 260,
                      height: 260,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => _imgFallback(),
                    ),
                  ),
                ],
              ],
            ),
          ),

          // STEP 3 — VIDEO
          _StepCard(
            step: 3,
            title: 'Generate video',
            subtitle:
                'Create a short video from your idea and CTA. You’ll get a download link when ready.',
            child: VideoGenerationSection(
              key: _videoKey,
              initialIdea: _ideaCtrl.text,
              initialPlatform: _platform,
              initialCta: _ctaCtrl.text,
              brandPreset: _brand(),
              onVideoReady: (url, taskId) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Video ready (task $taskId)')),
                );
              },
            ),
          ),

          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _imgFallback() => Container(
        width: 260,
        height: 260,
        decoration: BoxDecoration(
            color: Colors.grey.shade300, borderRadius: BorderRadius.circular(12)),
        child: const Icon(Icons.image, size: 48),
      );
}

/// --- Small UI helpers (visual only) ---

class _HeaderBrand extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(children: [
      Row(children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: const Color(0xFF0F2137),
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Icon(Icons.auto_awesome, color: Colors.white),
        ),
        const SizedBox(width: 12),
        const Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('SocialSpark',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              Text('AI-Powered Content Creation',
                  style: TextStyle(color: Colors.black54, fontSize: 12)),
            ],
          ),
        ),
      ]),
      const SizedBox(height: 12),
    ]);
  }
}

class _StepCard extends StatelessWidget {
  const _StepCard({
    required this.step,
    required this.title,
    required this.child,
    this.subtitle,
  });

  final int step;
  final String title;
  final String? subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      color: Colors.grey.shade50,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _StepHeader(step: step, title: title, subtitle: subtitle),
            const SizedBox(height: 12),
            child,
          ],
        ),
      ),
    );
  }
}

class _StepHeader extends StatelessWidget {
  const _StepHeader({required this.step, required this.title, this.subtitle});
  final int step;
  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        CircleAvatar(
          radius: 14,
          backgroundColor: Colors.black,
          child: Text('$step',
              style: const TextStyle(
                  color: Colors.white, fontWeight: FontWeight.bold)),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title,
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w700)),
            if (subtitle != null) ...[
              const SizedBox(height: 2),
              Text(subtitle!,
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(color: Colors.black54)),
            ],
          ]),
        ),
      ],
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner(this.message);
  final String message;
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        border: Border.all(color: Colors.red.shade200),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(Icons.error_outline, color: Colors.red.shade400),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: TextStyle(color: Colors.red.shade700),
            ),
          ),
        ],
      ),
    );
  }
}
