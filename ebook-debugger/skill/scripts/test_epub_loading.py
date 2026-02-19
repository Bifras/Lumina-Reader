#!/usr/bin/env python3
"""
Test script for EPUB Loading Issues (Bug #2, #3)

This script tests book loading functionality to ensure:
1. Books load correctly from library
2. No memory leaks when switching books
3. State updates correctly when loading

Usage: python test_epub_loading.py <epub-file-path>
"""

import os
import sys
import time

def print_test_step(step, description):
    """Print a formatted test step"""
    print(f"\n{'='*60}")
    print(f"TEST STEP {step}: {description}")
    print('='*60)

def print_success(msg):
    """Print success message"""
    print(f"✅ PASS: {msg}")

def print_fail(msg):
    """Print failure message"""
    print(f"❌ FAIL: {msg}")
    return False

def print_info(msg):
    """Print info message"""
    print(f"ℹ️  INFO: {msg}")

def print_warning(msg):
    """Print warning message"""
    print(f"⚠️  WARN: {msg}")

def verify_epub_file(filepath):
    """Verify the EPUB file exists and is valid"""
    if not filepath:
        print_warning("No EPUB file path provided")
        print_info("Usage: python test_epub_loading.py <path-to-epub>")
        return False

    if not os.path.exists(filepath):
        return print_fail(f"File not found: {filepath}")

    if not filepath.lower().endswith('.epub'):
        return print_fail(f"File is not an EPUB: {filepath}")

    file_size = os.path.getsize(filepath) / (1024 * 1024)
    print_info(f"EPUB file found: {os.path.basename(filepath)}")
    print_info(f"File size: {file_size:.2f} MB")

    return True

def test_epub_loading(filepath):
    """
    Test EPUB loading functionality

    Tests for:
    - Bug #2: activeBook undefined when loading from library
    - Bug #3: Memory leaks from event listeners
    """

    if not verify_epub_file(filepath):
        return False

    print_test_step(1, "Setup Test Environment")
    print_info("Open Lumina Reader application")
    print_info("Open DevTools (F12) to monitor console")
    print_info("Watch for:")
    print("  - React component errors")
    print("  - epubjs errors")
    print("  - Memory warnings")
    print("  - Event listener warnings")
    input("\nPress Enter when ready...")

    print_test_step(2, "Add EPUB to Library")
    print_info(f"Drag and drop: {os.path.basename(filepath)}")
    print_info("Or use the 'Add Book' button to select the file")
    input("\nPress Enter when book is added...")

    print_test_step(3, "Verify Book in Library")
    print_info("Check that:")
    print("  - Book appears in the library grid")
    print("  - Cover image loads (or placeholder)")
    print("  - Title and author are displayed")
    print("  - Progress bar shows 0%")

    book_in_library = input("\nIs book visible in library? (y/n): ").lower() == 'y'
    if not book_in_library:
        return print_fail("Book not added to library")

    print_success("Book added successfully")

    print_test_step(4, "Load Book from Library")
    print_info("Click on the book to open it")
    print_info("Watch the DevTools console during loading")
    print_info("\nLook for these console messages:")
    print("  ✅ '[DEBUG] Setting active book...'")
    print("  ✅ '[DEBUG] Generating locations...'")
    print("  ✅ '[DEBUG] Book loaded successfully'")
    print("\n❌ Bug #2 symptoms (if NOT fixed):")
    print("  - Error: 'Cannot read properties of undefined'")
    print("  - Warning: activeBook is undefined")
    print("  - UI does not update to reader view")
    input("\nPress Enter after book opens...")

    print_test_step(5, "Verify Reader View")
    print_info("Check that:")
    print("  - Reader view is displayed")
    print("  - Book pages are visible")
    print("  - Navigation controls appear at bottom")
    print("  - No errors in console about undefined values")

    book_opened = input("\nDid the book open in reader view? (y/n): ").lower() == 'y'
    if not book_opened:
        print_fail("Book did not open in reader view")
        console_errors = input("\nDid you see console errors? (y/n): ").lower() == 'y'
        if console_errors:
            print_warning("Bug #2 may still be present - activeBook undefined issue")
            return False
        return False

    print_success("Book opened successfully")

    print_test_step(6, "Test Progress Tracking")
    print_info("Navigate to different pages using:")
    print("  - Arrow keys (Left/Right)")
    print("  - Or click navigation buttons")
    print_info("Watch for 'relocated' events in console")
    print_info("Check if progress bar updates in library view")
    input("\nNavigate through several pages, then press Enter...")

    progress_tracking = input("\nDid progress bar update? (y/n): ").lower() == 'y'
    if not progress_tracking:
        print_warning("Progress tracking may not be working")
        print_info("This is a separate issue from Bug #2")
    else:
        print_success("Progress tracking working")

    print_test_step(7, "Test Memory Leaks - Switch Books")
    print_info("Return to library (click book icon in controls)")
    print_info("Open a DIFFERENT book (or same book again)")
    print_info("\n❌ Bug #3 symptoms (if NOT fixed):")
    print("  - Multiple 'relocated' events firing")
    print("  - App becomes slower with each book switch")
    print("  - Memory usage increases continuously")
    print("  - Console warnings about too many listeners")
    input("\nPress Enter after switching books...")

    print_test_step(8, "Verify Memory Leak Prevention")
    print_info("Check DevTools console for:")
    print("  ✅ '[DEBUG] Removing previous relocated listener'")
    print("  ✅ '[DEBUG] Destroying previous book engine'")
    print("\n❌ Bug #3 symptoms (if NOT fixed):")
    print("  - No cleanup messages in console")
    print("  - Old event listeners still firing")

    cleanup_working = input("\nDid you see cleanup messages in console? (y/n): ").lower() == 'y'
    if not cleanup_working:
        print_warning("Bug #3 may still be present - memory leaks from event listeners")
        return False

    print_success("Event listeners cleaned up correctly")

    print_test_step(9, "Test Rapid Book Switching")
    print_info("Switch between books 3-5 times rapidly")
    print_info("Watch for:")
    print("  - App performance degradation")
    print("  - Error messages")
    print("  - Console warnings")
    print("  - UI freezing")
    input("\nPress Enter after rapid switching...")

    app_stable = input("\nDid app remain stable? (y/n): ").lower() == 'y'
    if not app_stable:
        issues = input("\nWhat issues did you see? (memory/errors/freeze): ")
        if 'memory' in issues:
            print_fail("Memory leaks detected - Bug #3 still present")
        elif 'errors' in issues:
            print_fail("Runtime errors - need investigation")
        elif 'freeze' in issues:
            print_fail("App freezing - possible state management issue")
        return False

    print_success("App remains stable under rapid book switching")

    print_test_step(10, "Final Verification")
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    print("\n✅ Bug #2 (activeBook Undefined) Status: FIXED")
    print("✅ Bug #3 (Memory Leaks) Status: FIXED")
    print("\nAll tests passed!")
    print("Book loading now:")
    print("  - Loads books from library correctly")
    print("  - Sets activeBook state properly")
    print("  - Cleans up event listeners")
    print("  - Prevents memory leaks")
    print("  - Remains stable under rapid switching")
    print("\n" + "="*60)

    return True

def main():
    """Main test execution"""
    if len(sys.argv) < 2:
        verify_epub_file(None)
        sys.exit(1)

    epub_path = sys.argv[1]

    print("\n" + "="*60)
    print("LUMINA READER - EPUB LOADING TEST SUITE")
    print("Bugs #2 & #3: activeBook & Memory Leaks")
    print("="*60)
    print(f"\nTesting with EPUB: {os.path.basename(epub_path)}")
    print("="*60)

    try:
        success = test_epub_loading(epub_path)
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by custom")
        sys.exit(1)
    except Exception as e:
        print_fail(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
