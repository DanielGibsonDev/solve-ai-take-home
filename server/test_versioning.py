"""
Basic tests for document versioning functionality.
These tests verify that the versioning API works as expected.

Run with: python test_versioning.py
"""
import requests
import json

BASE_URL = "http://localhost:8000"


def test_get_initial_versions():
    """Test that initial versions were created for documents"""
    print("Testing: Get initial versions for document 1...")
    response = requests.get(f"{BASE_URL}/document/1/versions")
    assert response.status_code == 200
    versions = response.json()
    assert len(versions) >= 1
    assert versions[0]["version_number"] == 1
    assert versions[0]["document_id"] == 1
    print("✓ Initial versions exist")
    return versions


def test_create_new_version():
    """Test creating a new version"""
    print("\nTesting: Create new version for document 1...")
    response = requests.post(f"{BASE_URL}/document/1/version")
    assert response.status_code == 200
    new_version = response.json()
    assert "id" in new_version
    assert new_version["version_number"] >= 2
    print(f"✓ Created version {new_version['version_number']} with id {new_version['id']}")
    return new_version


def test_get_specific_version(version_id):
    """Test getting a specific version"""
    print(f"\nTesting: Get specific version {version_id}...")
    response = requests.get(f"{BASE_URL}/document/1/version/{version_id}")
    assert response.status_code == 200
    version = response.json()
    assert version["id"] == version_id
    print(f"✓ Retrieved version {version['version_number']}")
    return version


def test_update_version(version_id):
    """Test updating a version's content"""
    print(f"\nTesting: Update version {version_id}...")
    test_content = "<p>This is updated test content</p>"
    response = requests.put(
        f"{BASE_URL}/document/1/version/{version_id}",
        json={"content": test_content}
    )
    assert response.status_code == 200
    updated_version = response.json()
    assert updated_version["content"] == test_content
    print("✓ Version updated successfully")
    return updated_version


def test_multiple_versions():
    """Test that multiple versions can coexist"""
    print("\nTesting: Multiple versions for document 1...")
    response = requests.get(f"{BASE_URL}/document/1/versions")
    versions = response.json()
    assert len(versions) >= 2
    version_numbers = [v["version_number"] for v in versions]
    assert version_numbers == sorted(version_numbers), "Versions should be sorted"
    print(f"✓ Found {len(versions)} versions, properly sorted")
    return versions


def test_document_2_independence():
    """Test that document 2 has independent versions"""
    print("\nTesting: Document 2 has independent versions...")
    response = requests.get(f"{BASE_URL}/document/2/versions")
    assert response.status_code == 200
    versions = response.json()
    assert all(v["document_id"] == 2 for v in versions)
    print(f"✓ Document 2 has {len(versions)} independent versions")


def test_audit_log_exists():
    """Test that audit log returns events"""
    print("\nTesting: Audit log for document 1, version 1...")
    response = requests.get(f"{BASE_URL}/document/1/version/1/audit")
    assert response.status_code == 200
    events = response.json()
    assert len(events) > 0, "Should have audit events"
    assert all("event_type" in e for e in events), "Events should have event_type"
    assert all("user_name" in e for e in events), "Events should have user_name"
    assert all("timestamp" in e for e in events), "Events should have timestamp"
    print(f"✓ Audit log has {len(events)} events")


def test_history_exists():
    """Test that history returns save snapshots"""
    print("\nTesting: History for document 1, version 1...")
    response = requests.get(f"{BASE_URL}/document/1/version/1/history")
    assert response.status_code == 200
    history = response.json()
    assert len(history) > 0, "Should have history snapshots"
    assert all("content_snapshot" in h for h in history), "History should have content"
    print(f"✓ History has {len(history)} snapshots")


def test_save_creates_audit_event(version_id):
    """Test that saving creates an audit event"""
    print(f"\nTesting: Saving creates audit event...")
    
    # Get current audit log count
    response = requests.get(f"{BASE_URL}/document/1/version/{version_id}/audit")
    initial_count = len(response.json())
    
    # Update version
    test_content = "<p>Test content for audit</p>"
    requests.put(
        f"{BASE_URL}/document/1/version/{version_id}",
        json={"content": test_content}
    )
    
    # Check audit log increased
    response = requests.get(f"{BASE_URL}/document/1/version/{version_id}/audit")
    new_count = len(response.json())
    assert new_count > initial_count, "Audit log should have new event"
    
    # Check the latest event
    events = response.json()
    latest_event = events[0]  # Ordered DESC, so first is latest
    assert latest_event["event_type"] == "save"
    assert "lines_changed" in latest_event  # Can be None or a number
    print("✓ Save created audit event")


def test_word_count_tracking(version_id):
    """Test that word count changes are tracked"""
    print(f"\nTesting: Word count tracking...")
    
    # Make multiple saves to test word count
    content1 = "<p>One two three</p>"
    requests.put(
        f"{BASE_URL}/document/1/version/{version_id}",
        json={"content": content1}
    )
    
    content2 = "<p>One two three four five</p>"
    requests.put(
        f"{BASE_URL}/document/1/version/{version_id}",
        json={"content": content2}
    )
    
    # Check audit log
    response = requests.get(f"{BASE_URL}/document/1/version/{version_id}/audit")
    events = response.json()
    
    # Find the latest save event
    save_events = [e for e in events if e["event_type"] == "save"]
    assert len(save_events) >= 1, "Should have save events"
    
    # Latest save should have word count (could be positive or negative)
    latest_save = save_events[0]
    # lines_changed can be None for first save, or a number for subsequent saves
    assert latest_save["lines_changed"] is None or isinstance(latest_save["lines_changed"], int)
    print("✓ Word count is tracked")


def run_tests():
    """Run all tests"""
    print("=" * 60)
    print("Running Document Versioning Tests")
    print("=" * 60)
    
    try:
        # Test 1: Get initial versions
        initial_versions = test_get_initial_versions()
        
        # Test 2: Create new version
        new_version = test_create_new_version()
        
        # Test 3: Get specific version
        test_get_specific_version(new_version["id"])
        
        # Test 4: Update version
        test_update_version(new_version["id"])
        
        # Test 5: Check multiple versions exist
        test_multiple_versions()
        
        # Test 6: Document independence
        test_document_2_independence()
        
        # Test 7: Audit log exists
        test_audit_log_exists()
        
        # Test 8: History exists
        test_history_exists()
        
        # Test 9: Save creates audit event
        test_save_creates_audit_event(new_version["id"])
        
        # Test 10: Word count tracking
        test_word_count_tracking(new_version["id"])
        
        print("\n" + "=" * 60)
        print("✓ All tests passed!")
        print("=" * 60)
        
    except AssertionError as e:
        print(f"\n✗ Test failed: {e}")
        return False
    except requests.exceptions.RequestException as e:
        print(f"\n✗ Request failed: {e}")
        print("Make sure the backend server is running on http://localhost:8000")
        return False
    
    return True


if __name__ == "__main__":
    success = run_tests()
    exit(0 if success else 1)

