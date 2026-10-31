import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:avertiq_viewer/data/local/database/local_db_web.dart';
import 'package:avertiq_viewer/data/local/models/pending_report.dart';
import 'package:avertiq_viewer/models/sos_delivery_state.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('LocalDbWeb insert, retrieve, update, and delete workflow', () async {
    // Set up mock initial values for SharedPreferences
    SharedPreferences.setMockInitialValues({});

    final db = LocalDbImpl();
    await db.init();

    // 1. Insert report
    final report = PendingReport(
      localId: 'test-local-uuid-1',
      payloadJson: '{"category":"medical","description":"Test SOS"}',
      state: SosDeliveryState.queued,
      createdAt: DateTime.parse('2026-10-30T10:00:00.000Z'),
      category: 'medical',
      retryCount: 0,
    );
    await db.insertPendingReport(report);

    // 2. Retrieve report by ID
    final fetched = await db.getReport('test-local-uuid-1');
    expect(fetched, isNotNull);
    expect(fetched!.localId, equals('test-local-uuid-1'));
    expect(fetched.state, equals(SosDeliveryState.queued));
    expect(fetched.category, equals('medical'));

    // 3. Verify in queued reports
    final queued = await db.getQueuedReports();
    expect(queued.length, equals(1));
    expect(queued.first.localId, equals('test-local-uuid-1'));

    // 4. Update delivery state
    await db.updateReportState(
      'test-local-uuid-1',
      SosDeliveryState.received,
      serverId: 'srv-12345',
      retryCount: 1,
    );

    final updated = await db.getReport('test-local-uuid-1');
    expect(updated, isNotNull);
    expect(updated!.state, equals(SosDeliveryState.received));
    expect(updated.serverId, equals('srv-12345'));
    expect(updated.retryCount, equals(1));

    // 5. Queued reports should now be empty (state is received)
    final queuedAfterUpdate = await db.getQueuedReports();
    expect(queuedAfterUpdate, isEmpty);

    // 6. Delete report
    await db.deleteReport('test-local-uuid-1');
    final afterDelete = await db.getReport('test-local-uuid-1');
    expect(afterDelete, isNull);
  });
}

