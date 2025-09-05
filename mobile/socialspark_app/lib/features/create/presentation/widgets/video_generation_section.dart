import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/network/api_client.dart';
import '../../../create/data/datasources/create_remote_ds.dart';
import '../../../create/data/models/brand_preset.dart';
import '../../../create/data/models/task_status.dart';

class VideoGenerationSection extends StatefulWidget {
  const VideoGenerationSection({
    super.key,
    this.initialIdea,
    this.initialPlatform = 'instagram',
    this.initialCta = 'call and reserve',
    this.brandPreset,
    this.onVideoReady,
  });

  final String? initialIdea;
  final String initialPlatform;
  final String initialCta;
  final BrandPreset? brandPreset;
  final void Function(String videoUrl, String taskId)? onVideoReady;

  @override
  State<VideoGenerationSection> createState() => VideoGenerationSectionState();
}

class VideoGenerationSectionState extends State<VideoGenerationSection> {
  late final CreateRemoteDataSource _ds;

  final _ideaCtrl = TextEditingController();
  final _ctaCtrl = TextEditingController();

  // Dev helpers
  final _pasteJsonCtrl = TextEditingController();

  final _platforms = const ['instagram', 'tiktok'];

  String _platform = 'instagram';
  String? _error;
  bool _loading = false;

  String? _videoUrl;
  String? _taskId;
  String? _lastPolledStatus; // QUEUED | READY | FAILED | SUCCESS etc.

  // UI toggles
  bool _noMusic = false; // frontend-only hint

  @override
  void initState() {
    super.initState();
    _ds = CreateRemoteDataSource(ApiClient());
    _platform = widget.initialPlatform;
    _ideaCtrl.text = (widget.initialIdea?.trim().isNotEmpty ?? false)
        ? widget.initialIdea!.trim()
        : '15s TikTok for wildlife conservation ad';
    _ctaCtrl.text = widget.initialCta;

    // Pre-fill the dev JSON with a known-good sample storyboard
    _pasteJsonCtrl.text = const JsonEncoder.withIndent('  ').convert({
      "shots": [
        {"duration": 4, "text": "Playful monkey"},
        {"duration": 3, "text": "Cute panda"},
        {"duration": 4, "text": "Majestic lion"},
        {"duration": 3, "text": "Colorful parrot"},
        {"duration": 5, "text": "Wildlife logo call to action"}
      ],
      "music": "upbeat"
    });
  }

  @override
  void didUpdateWidget(covariant VideoGenerationSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initialIdea != oldWidget.initialIdea &&
        (widget.initialIdea ?? '').trim().isNotEmpty) {
      _ideaCtrl.text = widget.initialIdea!.trim();
    }
    if (widget.initialCta != oldWidget.initialCta &&
        widget.initialCta.trim().isNotEmpty) {
      _ctaCtrl.text = widget.initialCta.trim();
    }
    if (widget.initialPlatform != oldWidget.initialPlatform &&
        widget.initialPlatform.isNotEmpty) {
      _platform = widget.initialPlatform;
    }
  }

  @override
  void dispose() {
    _ideaCtrl.dispose();
    _ctaCtrl.dispose();
    _pasteJsonCtrl.dispose();
    super.dispose();
  }

  BrandPreset _brand() =>
      widget.brandPreset ??
      const BrandPreset(
        name: "Wildlife",
        colors: ["#FBBF24", "#0D2A4B"],
        tone: "Playful",
        defaultHashtags: ["#Wildlife"],
        footerText: "Wildlife 2025",
      );

  Map<String, dynamic> _brandApi() => _brand().toApiJson();

  /// Parent can update inputs before starting (e.g., pass caption as idea).
  void setInputs({String? idea, String? cta, String? platform}) {
    if (idea != null) _ideaCtrl.text = idea;
    if (cta != null) _ctaCtrl.text = cta;
    if (platform != null && platform.isNotEmpty) _platform = platform;
    if (mounted) setState(() {});
  }

  /// Public: trigger the whole flow (storyboard → render → poll).
  Future<void> start() => _start();

  // ----------------------------- FLOW --------------------------------

  Future<void> _start() async {
    if (!mounted || _loading) return;

    setState(() {
      _loading = true;
      _error = null;
      _videoUrl = null;
      _taskId = null;
      _lastPolledStatus = null;
    });

    final idea = _ideaCtrl.text.trim().isEmpty
        ? '15s TikTok for wildlife conservation ad'
        : _ideaCtrl.text.trim();
    final cta = _ctaCtrl.text.trim().isEmpty ? 'call and reserve' : _ctaCtrl.text.trim();

    try {
      // 1) Generate storyboard from idea (caption text can be used as idea)
      final Map<String, dynamic> sbBody = {
        "idea": idea,
        "language": "english",
        "number_of_shots": 5,
        "platform": _platform,
        "cta": cta,
        "brand_presets": _brandApi(),
      };
      debugPrint("POST /generate/storyboard -> ${jsonEncode(sbBody)}");

      final rawStoryboard = await _ds.startStoryboard(sbBody);

      // 2) Pass storyboard AS-IS into /render/video
      final storyboard = _toStoryboardMap(rawStoryboard);
      await _renderStoryboard(storyboard);
    } catch (e) {
      setState(() {
        _loading = false;
        _error = _extractError(e);
      });
    }
  }

  /// Render WITH a known-good storyboard (shots+music) and poll until READY.
  Future<void> _renderStoryboard(Map<String, dynamic> storyboard) async {
    try {
      // Optional frontend-only hint: if "No music" is toggled, overwrite music field.
      if (_noMusic) {
        storyboard = Map<String, dynamic>.from(storyboard);
        storyboard['music'] = 'none';
      }

      debugPrint('POST /render/video -> ${jsonEncode(storyboard)}');

      final renderResp = await _ds.startVideoRender(storyboard);
      final taskId = _extractTaskId(renderResp);
      _taskId = taskId;

      final status = await _pollTaskUntilDone(
        taskId,
        fetch: _ds.getTaskStatus,
        onTick: (s) {
          if (!mounted) return;
          setState(() => _lastPolledStatus = s.status);
        },
        timeout: const Duration(minutes: 10),
        interval: const Duration(seconds: 2),
      );

      final s = status.status.trim().toUpperCase(); // QUEUED | READY | FAILED
      if (s == 'READY' && (status.url?.isNotEmpty ?? false)) {
        setState(() {
          _videoUrl = status.url;
          _loading = false;
        });
        widget.onVideoReady?.call(status.url!, taskId);
      } else if (s == 'FAILED') {
        throw Exception(status.error ?? 'Video task failed.');
      } else {
        throw Exception('Video not ready (status=$s).');
      }
    } catch (e) {
      setState(() {
        _loading = false;
        _error = _extractError(e);
      });
    }
  }

  // ----------------------------- HELPERS -----------------------------

  /// Accept Map or JSON string. Do NOT reshape; send as-is to /render/video.
  Map<String, dynamic> _toStoryboardMap(dynamic raw) {
    if (raw is Map<String, dynamic>) return raw;
    if (raw is Map) return Map<String, dynamic>.from(raw);
    if (raw is String) {
      final decoded = jsonDecode(raw);
      if (decoded is Map<String, dynamic>) return decoded;
      if (decoded is Map) return Map<String, dynamic>.from(decoded);
    }
    throw const FormatException('Storyboard must be an object with "shots" and "music".');
  }

  String _extractTaskId(dynamic renderResponse) {
    if (renderResponse == null) throw Exception('Empty /render/video response');

    if (renderResponse is Map) {
      final m = Map<String, dynamic>.from(renderResponse);
      final id = (m['task_id'] ?? m['id'] ?? m['taskId'] ?? '').toString();
      if (id.isNotEmpty) return id;
    }
    if (renderResponse is String) {
      try {
        final m = jsonDecode(renderResponse);
        if (m is Map) {
          final id = (m['task_id'] ?? m['id'] ?? m['taskId'] ?? '').toString();
          if (id.isNotEmpty) return id;
        }
      } catch (_) {
        if (renderResponse.isNotEmpty) return renderResponse; // raw id string
      }
    }
    return renderResponse.toString();
  }

  Future<TaskStatus> _pollTaskUntilDone(
    String taskId, {
    required Future<TaskStatus> Function(String id) fetch,
    Duration timeout = const Duration(minutes: 10),
    Duration interval = const Duration(seconds: 2),
    void Function(TaskStatus s)? onTick,
  }) async {
    final deadline = DateTime.now().add(timeout);
    TaskStatus status = await fetch(taskId);
    onTick?.call(status);

    while (mounted) {
      final s = status.status.trim().toUpperCase();
      if (s == 'READY' || s == 'FAILED' || s == 'SUCCESS' || s == 'SUCCEEDED') break;
      if (DateTime.now().isAfter(deadline)) {
        throw Exception("Timed out waiting for task $taskId");
      }
      await Future.delayed(interval);
      status = await fetch(taskId);
      onTick?.call(status);
    }
    return status;
  }

  String _extractError(Object e) {
    if (e is DioException) {
      final data = e.response?.data;
      // Prefer explicit backend error messages if present
      if (data is Map && data['detail'] != null) return data['detail'].toString();
      if (data is String && data.trim().isNotEmpty) {
        // Show first part of HTML/text error responses too
        return data.length > 400 ? '${data.substring(0, 400)}…' : data;
      }
      return e.message ?? e.toString();
    }
    return e.toString();
  }

  Future<void> _openUrl(String url) async {
    try {
      final uri = Uri.parse(url);
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not open link')),
      );
    }
  }

  // ----------------------------- UI ----------------------------------

  @override
  Widget build(BuildContext context) {
    final statusChip = (_lastPolledStatus == null)
        ? const SizedBox.shrink()
        : Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Chip(
              label: Text(
                'Task status: ${_lastPolledStatus!.toUpperCase()}',
                style: const TextStyle(color: Colors.white),
              ),
              backgroundColor: _lastPolledStatus!.toUpperCase() == 'READY'
                  ? Colors.green
                  : (_lastPolledStatus!.toUpperCase() == 'FAILED'
                      ? Colors.red
                      : Colors.blueGrey),
            ),
          );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Video generator',
            style: Theme.of(context)
                .textTheme
                .titleMedium
                ?.copyWith(fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        TextField(
          controller: _ideaCtrl,
          maxLines: 2,
          decoration: InputDecoration(
            labelText: 'Idea (caption text is used)',
            hintText: 'Paste/auto-filled caption here',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
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
                  labelText: 'CTA',
                  hintText: 'call and reserve',
                  border: OutlineInputBorder(),
                ),
              ),
            ),
          ],
        ),

        // ✅ Overflow-proof toggle (Expanded label wraps to 2 lines)
        const SizedBox(height: 8),
        Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Switch(
              value: _noMusic,
              onChanged: (v) => setState(() => _noMusic = v),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Render without background music (frontend hint only)',
                softWrap: true,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),

        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            icon: const Icon(Icons.movie_creation_outlined),
            label: Text(_loading ? 'Generating…' : 'Generate Video'),
            onPressed: _loading ? null : _start,
          ),
        ),
        statusChip,

        // ---- Dev / debugging: paste a storyboard and render it directly ----
        const SizedBox(height: 16),
        ExpansionTile(
          title: const Text(
            'Advanced: paste storyboard JSON and render',
            softWrap: true,
            maxLines: 2,
          ),
          childrenPadding: const EdgeInsets.all(8),
          children: [
            TextField(
              controller: _pasteJsonCtrl,
              maxLines: 8,
              decoration: InputDecoration(
                hintText:
                    '{"shots":[{"duration":4,"text":"..."}],"music":"upbeat"}',
                border:
                    OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerRight,
              child: OutlinedButton.icon(
                onPressed: _loading
                    ? null
                    : () {
                        try {
                          final parsed = jsonDecode(_pasteJsonCtrl.text);
                          final story = _toStoryboardMap(parsed);
                          _renderStoryboard(story);
                        } catch (e) {
                          setState(() {
                            _error = 'Invalid JSON: $e';
                          });
                        }
                      },
                icon: const Icon(Icons.play_arrow),
                label: const Text('Render pasted storyboard'),
              ),
            ),
          ],
        ),
        // -------------------------------------------------------------------

        if (_error != null) ...[
          const SizedBox(height: 12),
          Text(_error!, style: const TextStyle(color: Colors.red)),
        ],
        if (_loading) ...[
          const SizedBox(height: 16),
          const Center(child: CircularProgressIndicator()),
        ],
        if (!_loading && (_videoUrl != null || _taskId != null)) ...[
          const SizedBox(height: 16),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Render result'),
                const SizedBox(height: 8),
                if (_videoUrl != null)
                  FilledButton.icon(
                    onPressed: () => _openUrl(_videoUrl!),
                    icon: const Icon(Icons.download_outlined),
                    label: const Text('Open / Download video'),
                  )
                else
                  const Text('Task created, waiting for READY…'),
                if (_taskId != null) ...[
                  const SizedBox(height: 8),
                  Text('Task: $_taskId'),
                ],
              ],
            ),
          ),
        ],
      ],
    );
  }
}
