import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:avertiq_viewer/data/local/database/local_db_web.dart';
import 'package:avertiq_viewer/data/local/models/pending_report.dart';
import 'package:avertiq_viewer/models/report_create.dart';
import 'package:avertiq_viewer/models/sos_delivery_state.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class _RealHttpOverrides extends HttpOverrides {}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  HttpOverrides.global = _RealHttpOverrides();

  test('E2E: Create SOS -> Save to Web DB -> POST to FastAPI -> 201 -> Update to RECEIVED', () async {
    SharedPreferences.setMockInitialValues({});
    final db = LocalDbImpl();
    await db.init();

    // 1. Create Report
    const localId = 'flutter-web-test-sos-001';
    const report = ReportCreate(
      originalText: 'SOS [Medical] E2E Pipeline Verification from Flutter Web [device:flutter-unit-test]',
      sourceChannel: 'mobile',
      language: 'en',
      latitude: 30.9010,
      longitude: 75.8573,
      locationDescription: '30.90100, 75.85730',
    );

    // 2. Save locally as queued
    final pending = PendingReport(
      localId: localId,
      payloadJson: report.toJsonString(),
      state: SosDeliveryState.queued,
      createdAt: DateTime.now(),
      category: 'Medical',
    );
    await db.insertPendingReport(pending);

    var stored = await db.getReport(localId);
    expect(stored, isNotNull);
    expect(stored!.state, equals(SosDeliveryState.queued));

    // 3. POST to actual FastAPI server at http://127.0.0.1:8000/api/v1/reports
    final response = await http.post(
      Uri.parse('http://127.0.0.1:8000/api/v1/reports'),
      headers: {'Content-Type': 'application/json'},
      body: report.toJsonString(),
    );

    expect(response.statusCode, equals(201));
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    final serverId = body['id'] as String;
    expect(serverId, isNotEmpty);

    // 4. Update local state to RECEIVED with serverId
    await db.updateReportState(
      localId,
      SosDeliveryState.received,
      serverId: serverId,
    );

    // 5. Verify local state is now RECEIVED
    final confirmed = await db.getReport(localId);
    expect(confirmed, isNotNull);
    expect(confirmed!.state, equals(SosDeliveryState.received));
    expect(confirmed.serverId, equals(serverId));

    // 6. Verify queued reports queue is now empty
    final queued = await db.getQueuedReports();
    expect(queued.any((r) => r.localId == localId), isFalse);
  });
}
