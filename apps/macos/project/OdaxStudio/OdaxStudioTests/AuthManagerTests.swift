// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

import XCTest
@testable import OdaxStudio

final class AuthManagerTests: XCTestCase {

    func testSharedInstanceIsSingleton() {
        let a = AuthManager.shared
        let b = AuthManager.shared
        XCTAssertTrue(a === b, "AuthManager.shared should return the same instance")
    }

    func testInitialState() {
        let am = AuthManager()
        XCTAssertNil(am.pendingAuthToken)
        XCTAssertNil(am.googleIdToken)
        XCTAssertNil(am.googleAccessToken)
        XCTAssertFalse(am.authCallbackReceived)
    }

    func testHandleAuthCallback_googleAuth() {
        let am = AuthManager()
        let url = URL(string: "odaxstudio://google-auth?id_token=test_id_token&access_token=test_access_token")!
        am.handleAuthCallback(url: url)
        
        XCTAssertEqual(am.googleIdToken, "test_id_token")
        XCTAssertEqual(am.googleAccessToken, "test_access_token")
        XCTAssertTrue(am.authCallbackReceived)
    }

    func testHandleAuthCallback_legacyToken() {
        let am = AuthManager()
        let url = URL(string: "odaxstudio://callback?token=legacy_token_value")!
        am.handleAuthCallback(url: url)
        
        XCTAssertEqual(am.pendingAuthToken, "legacy_token_value")
        XCTAssertTrue(am.authCallbackReceived)
    }

    func testHandleAuthCallback_schemeOnly() {
        let am = AuthManager()
        let url = URL(string: "odaxstudio://something")!
        am.handleAuthCallback(url: url)
        
        XCTAssertTrue(am.authCallbackReceived)
    }

    func testHandleAuthCallback_unknownScheme() {
        let am = AuthManager()
        let url = URL(string: "https://example.com/callback")!
        am.handleAuthCallback(url: url)
        
        // Should not crash but also not set any tokens
        XCTAssertNil(am.pendingAuthToken)
        XCTAssertNil(am.googleIdToken)
    }

    func testHandleAuthCallback_emptyTokens() {
        let am = AuthManager()
        let url = URL(string: "odaxstudio://google-auth?id_token=&access_token=")!
        am.handleAuthCallback(url: url)
        
        // Empty string tokens are technically "set" but the logic should handle gracefully
        XCTAssertNotNil(am.googleIdToken)
    }

    func testHandleAuthCallback_missingTokenParam() {
        let am = AuthManager()
        let url = URL(string: "odaxstudio://google-auth?other_param=value")!
        am.handleAuthCallback(url: url)
        
        XCTAssertNil(am.googleIdToken)
    }

    func testMultipleCallbacksOverwriteTokens() {
        let am = AuthManager()
        
        let url1 = URL(string: "odaxstudio://google-auth?id_token=first_token")!
        am.handleAuthCallback(url: url1)
        XCTAssertEqual(am.googleIdToken, "first_token")
        
        let url2 = URL(string: "odaxstudio://google-auth?id_token=second_token")!
        am.handleAuthCallback(url: url2)
        XCTAssertEqual(am.googleIdToken, "second_token")
    }
}
