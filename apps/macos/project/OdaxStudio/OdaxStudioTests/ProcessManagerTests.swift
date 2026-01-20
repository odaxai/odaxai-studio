// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

import XCTest
@testable import OdaxStudio

final class ProcessManagerTests: XCTestCase {

    func testInitialState() {
        let pm = ProcessManager()
        XCTAssertFalse(pm.isReady, "ProcessManager should not be ready at init")
        XCTAssertNil(pm.errorMessage, "No error expected at init")
    }

    func testServiceStatusesExist() {
        let pm = ProcessManager()
        XCTAssertNotNil(pm.serviceStatuses["Web Interface"])
        XCTAssertNotNil(pm.serviceStatuses["AI Engine"])
    }

    func testServiceStatusesStartAsStopped() {
        let pm = ProcessManager()
        XCTAssertEqual(pm.serviceStatuses["Web Interface"], .stopped)
        XCTAssertEqual(pm.serviceStatuses["AI Engine"], .stopped)
    }

    func testNoCodeServerReferences() {
        let pm = ProcessManager()
        XCTAssertNil(pm.serviceStatuses["Code Server"], "code-server should not exist in service statuses")
        XCTAssertNil(pm.serviceStatuses["IDE"], "IDE/code-server should not exist in service statuses")
    }

    func testServiceStatusEnum() {
        XCTAssertEqual(ServiceStatus.stopped.rawValue, "Waiting")
        XCTAssertEqual(ServiceStatus.starting.rawValue, "Starting")
        XCTAssertEqual(ServiceStatus.running.rawValue, "Ready")
        XCTAssertEqual(ServiceStatus.failed.rawValue, "Error")
    }
}
