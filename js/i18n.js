/**
 * Dev-C++ 5.11 Web Edition - Internationalization (i18n) Engine
 * Supported Locales:
 * - 'en': English (Default)
 * - 'vi': Tiếng Việt
 */

(function (window) {
  'use strict';

  const STORAGE_KEY = 'devcpp_lang';

  const TRANSLATIONS = {
    en: {
      // Titlebar & Window Chrome
      window_title_suffix: 'Dev-C++ 5.11 - [{file}]',
      win_minimize: 'Minimize',
      win_maximize: 'Maximize',
      win_close: 'Close',

      // Menubar: File
      menu_file: '<u>F</u>ile',
      m_new: '<u>N</u>ew Source File',
      m_open: '<u>O</u>pen...',
      m_save: '<u>S</u>ave',
      m_save_all: 'Save <u>A</u>ll',
      m_download: 'Download Project (ZIP)',
      m_export_file: 'Export Current File (.cpp)',

      // Menubar: Edit
      menu_edit: '<u>E</u>dit',
      m_undo: '<u>U</u>ndo',
      m_redo: '<u>R</u>edo',
      m_format: 'Format Code (AStyle)',

      // Menubar: Search
      menu_search: '<u>S</u>earch',
      m_find: '<u>F</u>ind...',

      // Menubar: View
      menu_view: '<u>V</u>iew',
      m_toggle_sidebar: 'Toggle Project Manager',

      // Menubar: Project
      menu_project: '<u>P</u>roject',
      m_proj_new: '<u>N</u>ew Project...',
      m_proj_add: '<u>A</u>dd to Project...',
      m_proj_remove: '<u>R</u>emove from Project...',
      m_proj_options: 'Project <u>O</u>ptions...',

      // Menubar: Execute
      menu_execute: 'E<u>x</u>ecute',
      m_compile: '<u>C</u>ompile',
      m_run: '<u>R</u>un',
      m_compile_run: 'Compile &amp; <u>R</u>un',
      m_rebuild: 'Rebuild All',
      m_tests: 'Run Testcases',
      m_stop: 'Stop Execution',

      // Menubar: Tools
      menu_tools: '<u>T</u>ools',
      m_intellisense: 'Code Suggestions (IntelliSense)',
      m_lang_en: 'English (Default)',
      m_lang_vi: 'Tiếng Việt',
      m_tool_dark: 'Theme: Dark',
      m_tool_classic: 'Theme: Classic 5.11',

      // Menubar: Window
      menu_window: '<u>W</u>indow',
      m_win_fullscreen: '<u>F</u>ull Screen',
      m_win_close_all: '<u>C</u>lose All',

      // Menubar: Help
      menu_help: '<u>H</u>elp',
      m_about: 'About Dev-C++ 5.11 Web Edition',

      // Toolbars
      tb_new: 'New Source File (Ctrl+N)',
      tb_open: 'Open... (Ctrl+O)',
      tb_save: 'Save (Ctrl+S)',
      tb_save_all: 'Save All',
      tb_download: 'Download Project (ZIP)',
      tb_undo: 'Undo (Ctrl+Z)',
      tb_redo: 'Redo (Ctrl+Y)',
      tb_cut: 'Cut (Ctrl+X)',
      tb_copy: 'Copy (Ctrl+C)',
      tb_paste: 'Paste (Ctrl+V)',
      tb_find: 'Find (Ctrl+F)',
      tb_format: 'Format Code (AStyle / Shift+Alt+F)',
      tb_compile: 'Compile (F9)',
      tb_compile_lbl: 'Compile',
      tb_run: 'Run (F10)',
      tb_run_lbl: 'Run',
      tb_compile_run: 'Compile & Run (F11)',
      tb_compile_run_lbl: 'Compile & Run',
      tb_rebuild: 'Rebuild All (F12)',
      tb_rebuild_lbl: 'Rebuild',
      tb_tests: 'Run Testcases (F8)',
      tb_tests_lbl: 'Test',
      tb_stop: 'Stop',
      tb_compiler_profile: 'Compiler Profile',
      tb_theme: 'Theme',
      tb_language: 'Language',
      lang_opt_en: 'English (Default)',
      lang_opt_vi: 'Tiếng Việt',

      // Sidebar
      sb_tab_project: 'Project',
      sb_tab_classes: 'Classes',
      sb_tab_project_tt: 'Project Files',
      sb_tab_classes_tt: 'Class Hierarchy',
      sb_btn_new_file: 'New file (.cpp, .h, .c) [Alt+N]',
      sb_btn_new_folder: 'New folder',
      sb_btn_delete: 'Delete selected item (Delete)',
      sb_btn_toggle_unit: 'Toggle Project Unit (Include/Exclude from Build)',
      sb_btn_collapse_all: 'Collapse all folders',
      sb_unit_badge_in: 'Unit included in project build',
      sb_unit_badge_out: 'Excluded from build',

      // Context Menu
      ctx_new_file: 'New Source File (.cpp, .h, .c)...',
      ctx_new_folder: 'New Folder...',
      ctx_rename_proj: 'Rename Project...',
      ctx_delete: 'Delete Selected Item',
      ctx_proj_options: 'Project Options...',
      ctx_export_zip: 'Export Entire Project (.ZIP)...',
      ctx_new_file_in_folder: 'New File in Folder...',
      ctx_new_subfolder: 'New Subfolder...',
      ctx_rename_folder: 'Rename Folder...',
      ctx_open_file: 'Open File in Editor',
      ctx_rename_file: 'Rename File...',
      ctx_include_unit: 'Include in Project (Compile Unit)',
      ctx_exclude_unit: 'Exclude from Project (Do Not Compile)',

      // Editor & Tab Bar
      tab_add: 'New file tab (+)',
      splitter_bottom_tt: 'Drag to resize Bottom Dock, double-click to toggle',

      // Bottom Dock
      dock_tab_compiler_log: 'Compiler Log',
      dock_tab_compiler_log_tt: 'Compiler build output log',
      dock_tab_error_list: 'Error List',
      dock_tab_error_list_tt: 'Diagnostics and syntax error list',
      dock_tab_testcases: 'Testcases',
      dock_tab_testcases_tt: 'Automated testcase runner',
      dock_tab_resources: 'Resources',
      dock_tab_resources_tt: 'Win32 resources and application manifest',
      dock_toggle_tt: 'Toggle Bottom Dock',
      dock_close_tt: 'Close Bottom Dock',

      // Compiler Log Panel
      dock_log_header: 'Compiler: TDM-GCC 4.9.2 64-bit Release (WASM Clang Toolchain)',
      dock_copy_log: 'Copy',
      dock_copy_log_tt: 'Copy full build log',
      dock_clear_log: 'Clear',
      dock_clear_log_tt: 'Clear build log',
      dock_log_ready: 'Compiler Ready. Ready to compile (F9 / F11).',

      // Error List Panel
      err_summary_zero: '0 Errors, 0 Warnings',
      err_summary_counts: '{errors} Errors, {warnings} Warnings',
      err_filter_all: 'All',
      err_filter_all_tt: 'Show all messages',
      err_filter_errors: 'Errors ({count})',
      err_filter_errors_tt: 'Show compilation errors only',
      err_filter_warnings: 'Warnings ({count})',
      err_filter_warnings_tt: 'Show warnings only',
      col_severity: 'Severity',
      col_unit: 'File / Unit',
      col_line: 'Line',
      col_col: 'Col',
      col_message: 'Diagnostic Message',
      err_empty_msg: 'No compilation errors.',

      // Testcases Panel
      test_summary_title: 'Automated Test Runner:',
      test_summary_unrun: 'Not run yet',
      test_summary_stats: '{passed}/{total} Passed',
      btn_add_test: 'Add Test',
      btn_reset_tests: 'Reset Samples',
      test_case_lbl: 'Testcase #{num}:',
      test_input_lbl: 'Input (stdin):',
      test_expected_lbl: 'Expected Output:',
      test_actual_lbl: 'Actual Output:',
      test_run_single: 'Run',
      test_delete: 'Delete',
      test_status_passed: 'PASSED',
      test_status_failed: 'FAILED',
      test_status_timeout: 'TIMEOUT',

      // Resources Panel
      res_info_bar: 'Windows Application Resources & Manifest:',
      res_th_prop: 'Property',
      res_th_val: 'Current Value',
      res_th_status: 'Status',
      res_script_name: 'Resource Script',
      res_script_val: 'None (Project1.rc)',
      res_script_status: 'Default',
      res_icon_name: 'Application Icon',
      res_icon_val: 'IDI_ICON1 (Default Dev-C++ 5.11 Icon)',
      res_icon_status: 'Loaded',
      res_exec_name: 'Execution Level',
      res_exec_val: 'asInvoker (Standard User Privileges)',
      res_exec_status: 'Valid',
      res_comp_name: 'Resource Compiler',
      res_comp_val: 'windres.exe (GNU-Win32 Resource Compiler)',
      res_comp_status: 'Ready',

      // Statusbar
      status_loading: 'Loading compiler environment...',
      status_ready: 'Dev-C++ Compiler is ready!',
      status_compiling: 'Compiling project...',
      status_running: 'Running executable in Command Prompt...',
      status_compile_success: 'Compilation successful!',
      status_compile_failed: 'Compilation failed with errors.',
      status_pos_tt: 'Cursor Line & Column',
      status_path_tt: 'Current source file path',
      status_encoding_tt: 'Character encoding (UTF-8)',
      status_mode_tt: 'Input mode: Insert or Overwrite (Click to toggle)',
      status_rw_tt: 'Read / Write status',
      status_compiler_tt: 'Current compiler profile',
      status_pos_fmt: 'Line: {line}, Col: {col}',

      // Dialogs & Modals
      dlg_proj_opt_title: 'Project Options - {name}',
      dlg_tab_general: 'General',
      dlg_tab_files: 'Files / Units',
      dlg_tab_compiler: 'Compiler',
      dlg_proj_details: 'Project Details',
      dlg_proj_name: 'Project Name:',
      dlg_proj_target: 'Target Executable:',
      dlg_proj_type: 'Project Type:',
      dlg_proj_units: 'Included Project Units',
      dlg_compiler_settings: 'Compiler Settings',
      dlg_compiler_version: 'Compiler Version:',
      dlg_cpp_standard: 'C++ Standard:',
      dlg_optimization: 'Optimization:',
      dlg_btn_ok: 'OK',
      dlg_btn_cancel: 'Cancel',

      dlg_new_file_title: 'New File',
      dlg_new_file_prompt: 'New file name (e.g. calc.cpp, utils.h):',
      dlg_new_folder_title: 'New Folder',
      dlg_new_folder_prompt: 'New folder name:',
      dlg_rename_title: 'Rename Item',
      dlg_rename_prompt: 'Enter new name:',

      // Alert & Confirmations
      alert_uncompiled: 'Project has not been compiled yet, please press F9 or F11 first',
      confirm_save_changes: 'Do you want to save changes to {file}?',
      alert_file_exists: 'File "{name}" already exists!',
      alert_root_delete: 'Cannot delete the project root directory!',
      alert_last_file: 'Cannot close the last open file!',
      alert_no_testcases: 'No testcases defined! Please add at least 1 testcase.',
      alert_console_empty: 'Console buffer is empty!',
      alert_copy_console_manual: 'Unable to auto-copy. Please highlight text on the Console and press Ctrl+C.',
      alert_zip_error: 'ZIP Export Error: ',
      about_title: 'About Dev-C++ 5.11 Web Edition',
      about_text: 'Dev-C++ 5.11 Web Edition\nEmbarcadero Dev-C++ & Bloodshed Dev-C++ Replica\n\n- Compiler: Clang 8.0.1 (WebAssembly Client-Side)\n- Environment: 100% In-Browser Execution (Zero Backend Dependency)\n- UI: Win32 Classic Dev-C++ 5.11',

      // Win32 CMD Popup
      cmd_copy_tt: 'Copy full text from Console',
      cmd_clear_tt: 'Clear Console screen',
      cmd_eof_tt: 'Send EOF signal (Ctrl+D)',
      cmd_exit_footer: 'Process exited after {sec} seconds with return value {code}. Press any key to continue . . .',

      // Splash Screen
      splash_title: 'Dev-C++ Web Edition',
      splash_desc: 'Loading <strong>Clang Compiler &amp; C++ STL</strong> into browser...',
      splash_subtext: 'Data is saved automatically to your browser (IndexedDB), instant access on next visit!',
      splash_init: 'Initializing compiler environment...',
      splash_downloading: 'Downloading {file} ({percent}%)...',

      // Additional Status & Run messages
      status_no_file: 'No file open',
      status_compiling_f9: 'Compiling source code (F9)...',
      status_compiling_f11: 'Compiling and launching (F11)...',
      status_compile_success_time: 'Compilation successful ({time}s)! Ready to run (F10).',
      status_compile_failed_log: 'Compilation failed! Check Compiler Log.',
      status_compile_failed_errlist: 'Compilation failed! Check Error List.',
      status_waiting_input_console: 'Waiting for keyboard input in Console...',
      status_waiting_input_short: 'Waiting for input... (Type & Enter)',
      status_console_ready: 'Console Ready',
      status_console_running: 'Running...',
      status_worker_error: 'Web Worker Error: {err}',
      status_test_starting: 'Starting test runner...',
      status_test_waiting: 'Waiting',
      status_test_empty_tip: 'No testcases defined. Click "Add Test" to create one.',
      term_compile_err: '[Compilation Error] Please check Error List / Compiler Log.',
      term_exec_err: '[Execution Error] {err}',
      log_compile_in_progress: 'Compiling...',
      log_compile_clean: 'Compilation complete, 0 errors.',
      click_to_jump: 'Click to jump to {file}:{line}',

      // Dialogs & Prompts
      confirm_load_template: 'Do you want to load this template? (Current code will be replaced)',
      confirm_new_file_prompt: 'Create new file? Make sure you have saved your current changes.',
      confirm_delete_msg: 'Are you sure you want to delete {type} "{name}"?',
      confirm_close_file: 'Are you sure you want to close "{name}"?',
      confirm_close_window: 'Close Dev-C++ 5.11 Web Edition? Make sure all files are saved.',
      prompt_new_project_name: 'Enter new project name:',
      prompt_new_file_name: 'New file name (e.g. calc.cpp, utils.h):',
      err_create_file_prefix: 'Error creating file: ',
      err_create_folder_prefix: 'Error creating folder: ',
      err_rename_prefix: 'Error renaming: ',
      err_delete_prefix: 'Error deleting: ',
      type_folder: 'folder',
      type_file: 'file',
      test_all_passed: 'ALL TESTCASES PASSED ({passed}/{total})',
      test_failed_count: 'test(s) failed ({passed}/{total})',
      err_name_empty: 'Name cannot be empty!',
      err_name_invalid_chars: 'Name cannot contain special characters: \\ / : * ? " < > |',
      status_astyle_formatted: 'Source code formatted (AStyle Allman)',
      status_saved_vfs: 'Saved source code and files to browser!',
      status_saved_all: 'Saved all files in project!',
      status_renamed_proj: 'Renamed project to "{name}"',
      status_all_files_closed: 'All files closed.',
      status_file_opened: 'Opened file: {name}',
      status_zipping_project: 'Compressing project to .ZIP...',
      status_zipped_success: 'Project .ZIP file downloaded!',
      status_empty_open_files: '(No open files)',
      status_empty_classes: '(No classes defined)',
      status_input_cleared: 'Input tab cleared!',
      status_input_loaded: 'Sample data loaded into Input tab!',
      status_input_no_sample: 'This problem has no sample input.',
      status_busy_task: 'Executing another task...',
      status_rebuilding_all: 'Rebuilding entire project...',
      status_state_saved: 'Project state saved',
      btn_copied: 'Copied',
      tab_close_file: 'Close file'
    },

    vi: {
      // Titlebar & Window Chrome
      window_title_suffix: 'Dev-C++ 5.11 - [{file}]',
      win_minimize: 'Thu nhỏ',
      win_maximize: 'Phóng to',
      win_close: 'Đóng',

      // Menubar: File
      menu_file: '<u>T</u>ệp',
      m_new: 'Tạo file nguồn <u>m</u>ới',
      m_open: '<u>M</u>ở...',
      m_save: '<u>L</u>ưu',
      m_save_all: 'Lưu <u>t</u>ất cả',
      m_download: 'Tải dự án (ZIP)',
      m_export_file: 'Xuất file hiện tại (.cpp)',

      // Menubar: Edit
      menu_edit: '<u>C</u>hỉnh sửa',
      m_undo: '<u>H</u>oàn tác',
      m_redo: '<u>L</u>àm lại',
      m_format: 'Định dạng mã nguồn (AStyle)',

      // Menubar: Search
      menu_search: '<u>T</u>ìm kiếm',
      m_find: '<u>T</u>ìm kiếm...',

      // Menubar: View
      menu_view: '<u>H</u>iển thị',
      m_toggle_sidebar: 'Bật/Tắt thanh dự án',

      // Menubar: Project
      menu_project: '<u>D</u>ự án',
      m_proj_new: '<u>D</u>ự án mới...',
      m_proj_add: '<u>T</u>hêm vào dự án...',
      m_proj_remove: '<u>X</u>óa khỏi dự án...',
      m_proj_options: 'Tùy <u>c</u>họn dự án...',

      // Menubar: Execute
      menu_execute: '<u>T</u>hực thi',
      m_compile: '<u>B</u>iên dịch',
      m_run: '<u>C</u>hạy',
      m_compile_run: '<u>D</u>ịch &amp; Chạy',
      m_rebuild: 'Xây dựng lại tất cả',
      m_tests: 'Chạy kiểm thử',
      m_stop: 'Dừng thực thi',

      // Menubar: Tools
      menu_tools: '<u>C</u>ông cụ',
      m_intellisense: 'Gợi ý code (IntelliSense)',
      m_lang_en: 'English (Mặc định)',
      m_lang_vi: 'Tiếng Việt',
      m_tool_dark: 'Giao diện: Tối',
      m_tool_classic: 'Giao diện: Cổ điển 5.11',

      // Menubar: Window
      menu_window: '<u>C</u>ửa sổ',
      m_win_fullscreen: '<u>T</u>oàn màn hình',
      m_win_close_all: 'Đóng tất <u>c</u>ả',

      // Menubar: Help
      menu_help: 'Trợ <u>g</u>iúp',
      m_about: '<u>G</u>iới thiệu Dev-C++ 5.11 Web Edition',

      // Toolbars
      tb_new: 'Tạo file nguồn mới (Ctrl+N)',
      tb_open: 'Mở... (Ctrl+O)',
      tb_save: 'Lưu (Ctrl+S)',
      tb_save_all: 'Lưu tất cả',
      tb_download: 'Tải dự án (ZIP)',
      tb_undo: 'Hoàn tác (Ctrl+Z)',
      tb_redo: 'Làm lại (Ctrl+Y)',
      tb_cut: 'Cắt (Ctrl+X)',
      tb_copy: 'Sao chép (Ctrl+C)',
      tb_paste: 'Dán (Ctrl+V)',
      tb_find: 'Tìm kiếm (Ctrl+F)',
      tb_format: 'Định dạng mã nguồn (AStyle / Shift+Alt+F)',
      tb_compile: 'Biên dịch (F9)',
      tb_compile_lbl: 'Biên dịch',
      tb_run: 'Chạy (F10)',
      tb_run_lbl: 'Chạy',
      tb_compile_run: 'Dịch & Chạy (F11)',
      tb_compile_run_lbl: 'Dịch & Chạy',
      tb_rebuild: 'Rebuild All (F12)',
      tb_rebuild_lbl: 'Rebuild',
      tb_tests: 'Chạy Testcases (F8)',
      tb_tests_lbl: 'Test',
      tb_stop: 'Dừng',
      tb_compiler_profile: 'Cấu hình trình biên dịch',
      tb_theme: 'Giao diện',
      tb_language: 'Ngôn ngữ',
      lang_opt_en: 'Tiếng Anh (Mặc định)',
      lang_opt_vi: 'Tiếng Việt',

      // Sidebar
      sb_tab_project: 'Dự án',
      sb_tab_classes: 'Lớp',
      sb_tab_project_tt: 'Tệp dự án',
      sb_tab_classes_tt: 'Cây phân cấp lớp',
      sb_btn_new_file: 'Tạo file mới (.cpp, .h, .c) [Alt+N]',
      sb_btn_new_folder: 'Tạo thư mục mới',
      sb_btn_delete: 'Xóa mục đang chọn (Delete)',
      sb_btn_toggle_unit: 'Bật/Tắt Unit dự án (Include/Exclude from Build)',
      sb_btn_collapse_all: 'Thu gọn toàn bộ thư mục',
      sb_unit_badge_in: 'Unit được tính vào bản dịch dự án',
      sb_unit_badge_out: 'Đã loại trừ khỏi bản dịch',

      // Context Menu
      ctx_new_file: 'Tạo File Mới (.cpp, .h, .c)...',
      ctx_new_folder: 'Tạo Thư Mục Mới...',
      ctx_rename_proj: 'Đổi Tên Dự Án (Rename)...',
      ctx_delete: 'Xóa Mục Đang Chọn (Delete)',
      ctx_proj_options: 'Tùy chọn dự án...',
      ctx_export_zip: 'Xuất toàn bộ Project (.ZIP)...',
      ctx_new_file_in_folder: 'Tạo File Mới Trong Thư Mục...',
      ctx_new_subfolder: 'Tạo Thư Mục Con...',
      ctx_rename_folder: 'Đổi Tên Thư Mục...',
      ctx_open_file: 'Mở File Trong Editor',
      ctx_rename_file: 'Đổi Tên File...',
      ctx_include_unit: 'Tính Vào Dự Án (Compile Unit)',
      ctx_exclude_unit: 'Loại Khỏi Dự Án (Không Dịch)',

      // Editor & Tab Bar
      tab_add: 'Tạo tab file mới (+)',
      splitter_bottom_tt: 'Kéo để chỉnh độ cao Bottom Dock, nhấp đúp để ẩn/hiện',

      // Bottom Dock
      dock_tab_compiler_log: 'Compiler Log',
      dock_tab_compiler_log_tt: 'Log quá trình biên dịch',
      dock_tab_error_list: 'Error List',
      dock_tab_error_list_tt: 'Danh sách lỗi và cảnh báo cú pháp',
      dock_tab_testcases: 'Testcases',
      dock_tab_testcases_tt: 'Bộ kiểm thử tự động',
      dock_tab_resources: 'Resources',
      dock_tab_resources_tt: 'Tài nguyên dự án (windres & manifest)',
      dock_toggle_tt: 'Thu gọn / Mở rộng Bottom Dock',
      dock_close_tt: 'Đóng Bottom Dock',

      // Compiler Log Panel
      dock_log_header: 'Trình biên dịch: TDM-GCC 4.9.2 64-bit Release (WASM Clang Toolchain)',
      dock_copy_log: 'Sao chép',
      dock_copy_log_tt: 'Sao chép toàn bộ log',
      dock_clear_log: 'Xóa log',
      dock_clear_log_tt: 'Xóa log',
      dock_log_ready: 'Compiler Ready. Sẵn sàng biên dịch (F9 / F11).',

      // Error List Panel
      err_summary_zero: '0 Lỗi, 0 Cảnh báo',
      err_summary_counts: '{errors} Lỗi, {warnings} Cảnh báo',
      err_filter_all: 'Tất cả',
      err_filter_all_tt: 'Hiện tất cả thông báo',
      err_filter_errors: 'Lỗi ({count})',
      err_filter_errors_tt: 'Chỉ hiện lỗi biên dịch',
      err_filter_warnings: 'Cảnh báo ({count})',
      err_filter_warnings_tt: 'Chỉ hiện cảnh báo',
      col_severity: 'Loại',
      col_unit: 'File / Unit',
      col_line: 'Dòng',
      col_col: 'Cột',
      col_message: 'Chi tiết thông báo',
      err_empty_msg: 'Không có lỗi biên dịch nào.',

      // Testcases Panel
      test_summary_title: 'Bộ Test Tự Động:',
      test_summary_unrun: 'Chưa chạy',
      test_summary_stats: '{passed}/{total} Đạt',
      btn_add_test: 'Thêm Test',
      btn_reset_tests: 'Reset Test Mẫu',
      test_case_lbl: 'Ca kiểm thử #{num}:',
      test_input_lbl: 'Đầu vào (stdin):',
      test_expected_lbl: 'Đầu ra mong đợi:',
      test_actual_lbl: 'Đầu ra thực tế:',
      test_run_single: 'Chạy',
      test_delete: 'Xóa',
      test_status_passed: 'ĐẠT (PASS)',
      test_status_failed: 'THẤT BẠI (FAIL)',
      test_status_timeout: 'QUÁ THỜI GIAN',

      // Resources Panel
      res_info_bar: 'Thông tin tài nguyên ứng dụng Windows (Win32 Resources & Manifest):',
      res_th_prop: 'Thuộc tính',
      res_th_val: 'Giá trị hiện tại',
      res_th_status: 'Trạng thái',
      res_script_name: 'Resource Script',
      res_script_val: 'None (Project1.rc)',
      res_script_status: 'Mặc định',
      res_icon_name: 'Application Icon',
      res_icon_val: 'IDI_ICON1 (Default Dev-C++ 5.11 Icon)',
      res_icon_status: 'Đã nạp',
      res_exec_name: 'Execution Level',
      res_exec_val: 'asInvoker (Standard User Privileges)',
      res_exec_status: 'Hợp lệ',
      res_comp_name: 'Resource Compiler',
      res_comp_val: 'windres.exe (GNU-Win32 Resource Compiler)',
      res_comp_status: 'Sẵn sàng',

      // Statusbar
      status_loading: 'Đang tải trình biên dịch...',
      status_ready: 'Dev-C++ Compiler đã sẵn sàng!',
      status_compiling: 'Đang biên dịch dự án...',
      status_running: 'Đang thực thi chương trình trong Command Prompt...',
      status_compile_success: 'Biên dịch thành công!',
      status_compile_failed: 'Biên dịch thất bại!',
      status_pos_tt: 'Vị trí con trỏ (Dòng & Cột)',
      status_path_tt: 'Đường dẫn file mã nguồn hiện tại',
      status_encoding_tt: 'Mã hóa ký tự (UTF-8)',
      status_mode_tt: 'Chế độ nhập: Insert hoặc Overwrite (Nhấp để đổi)',
      status_rw_tt: 'Trạng thái đọc / ghi',
      status_compiler_tt: 'Cấu hình trình biên dịch hiện tại',
      status_pos_fmt: 'Line: {line}, Col: {col}',

      // Dialogs & Modals
      dlg_proj_opt_title: 'Tùy chọn dự án - {name}',
      dlg_tab_general: 'Chung',
      dlg_tab_files: 'Tập tin / Units',
      dlg_tab_compiler: 'Trình biên dịch',
      dlg_proj_details: 'Chi tiết dự án',
      dlg_proj_name: 'Tên dự án:',
      dlg_proj_target: 'Tập tin thực thi:',
      dlg_proj_type: 'Loại dự án:',
      dlg_proj_units: 'Các Unit thuộc dự án',
      dlg_compiler_settings: 'Cài đặt trình biên dịch',
      dlg_compiler_version: 'Phiên bản trình biên dịch:',
      dlg_cpp_standard: 'Chuẩn C++:',
      dlg_optimization: 'Tối ưu hóa:',
      dlg_btn_ok: 'Đồng ý',
      dlg_btn_cancel: 'Hủy bỏ',

      dlg_new_file_title: 'Tạo File Mới',
      dlg_new_file_prompt: 'Tên file mới (ví dụ: calc.cpp, utils.h):',
      dlg_new_folder_title: 'Tạo Thư Mục Mới',
      dlg_new_folder_prompt: 'Tên thư mục mới:',
      dlg_rename_title: 'Đổi Tên',
      dlg_rename_prompt: 'Nhập tên mới:',

      // Alert & Confirmations
      alert_uncompiled: 'Chưa biên dịch dự án, vui lòng nhấn F9 hoặc F11 để dịch trước',
      confirm_save_changes: 'Bạn có muốn lưu các thay đổi cho {file} không?',
      alert_file_exists: 'File "{name}" đã tồn tại!',
      alert_root_delete: 'Không thể xóa thư mục gốc của dự án!',
      alert_last_file: 'Không thể đóng file cuối cùng!',
      alert_no_testcases: 'Chưa có testcase nào! Hãy thêm ít nhất 1 testcase.',
      alert_console_empty: 'Console đang trống!',
      alert_copy_console_manual: 'Không thể sao chép tự động. Hãy bôi đen text trên Console rồi nhấn Ctrl+C.',
      alert_zip_error: 'Lỗi xuất ZIP: ',
      about_title: 'Giới thiệu Dev-C++ 5.11 Web Edition',
      about_text: 'Dev-C++ 5.11 Web Edition\nBản sao Embarcadero Dev-C++ & Bloodshed Dev-C++\n\n- Trình biên dịch: Clang 8.0.1 (WebAssembly Client-Side)\n- Môi trường: 100% In-Browser Execution (Không dùng server/VPS)\n- Giao diện: Win32 Classic Dev-C++ 5.11',

      // Win32 CMD Popup
      cmd_copy_tt: 'Sao chép toàn bộ text trên Console',
      cmd_clear_tt: 'Xóa màn hình Console',
      cmd_eof_tt: 'Gửi tín hiệu kết thúc EOF (Ctrl+D)',
      cmd_exit_footer: 'Process exited after {sec} seconds with return value {code}. Press any key to continue . . .',

      // Splash Screen
      splash_title: 'Dev-C++ Web Edition',
      splash_desc: 'Đang tải bộ biên dịch <strong>Clang &amp; Thư viện C++ STL</strong> vào trình duyệt...',
      splash_subtext: 'Dữ liệu sẽ được lưu tự động vào máy bạn (IndexedDB), lần sau vào web sẽ mở ngay lập tức không cần tải lại!',
      splash_init: 'Đang khởi tạo môi trường...',
      splash_downloading: 'Đang tải {file} ({percent}%)...',

      // Additional Status & Run messages
      status_no_file: 'Chưa mở file',
      status_compiling_f9: 'Đang biên dịch mã nguồn (F9)...',
      status_compiling_f11: 'Đang biên dịch và khởi chạy (F11)...',
      status_compile_success_time: 'Biên dịch thành công ({time}s)! Sẵn sàng chạy (F10).',
      status_compile_failed_log: 'Biên dịch thất bại! Kiểm tra Compiler Log.',
      status_compile_failed_errlist: 'Biên dịch thất bại! Kiểm tra Error List.',
      status_waiting_input_console: 'Đang đợi bạn nhập dữ liệu từ bàn phím trong Console...',
      status_waiting_input_short: 'Đang đợi nhập... (Gõ phím & Enter)',
      status_console_ready: 'Console sẵn sàng',
      status_console_running: 'Đang chạy...',
      status_worker_error: 'Lỗi Web Worker: {err}',
      status_test_starting: 'Đang bắt đầu chạy bộ test...',
      status_test_waiting: 'Đang chờ',
      status_test_empty_tip: 'Chưa có testcase nào. Hãy bấm "Thêm Test".',
      term_compile_err: '[Lỗi biên dịch] Vui lòng xem tab Error List / Compiler Log.',
      term_exec_err: '[Lỗi thực thi] {err}',
      log_compile_in_progress: 'Đang biên dịch...',
      log_compile_clean: 'Biên dịch hoàn tất, không có lỗi.',
      click_to_jump: 'Nhấp chuột để nhảy đến {file}:{line}',

      // Dialogs & Prompts
      confirm_load_template: 'Bạn có muốn tải mẫu bài này không? (Code hiện tại sẽ được thay thế)',
      confirm_new_file_prompt: 'Tạo file mới? Hãy chắc chắn bạn đã lưu code hiện tại.',
      confirm_delete_msg: 'Bạn có chắc muốn xóa {type} "{name}"?',
      confirm_close_file: 'Bạn có chắc muốn đóng file "{name}"?',
      confirm_close_window: 'Đóng Dev-C++ 5.11 Web Edition? Hãy chắc chắn bạn đã lưu toàn bộ file.',
      prompt_new_project_name: 'Nhập tên dự án mới:',
      prompt_new_file_name: 'Tên file mới (ví dụ: utils.h, solution.cpp):',
      err_create_file_prefix: 'Lỗi tạo file: ',
      err_create_folder_prefix: 'Lỗi tạo thư mục: ',
      err_rename_prefix: 'Lỗi đổi tên: ',
      err_delete_prefix: 'Lỗi xóa: ',
      type_folder: 'thư mục',
      type_file: 'file',
      test_all_passed: 'TOÀN BỘ TEST ĐÃ PASS ({passed}/{total})',
      test_failed_count: 'test thất bại ({passed}/{total})',
      err_name_empty: 'Tên không được để trống!',
      err_name_invalid_chars: 'Tên không được chứa ký tự đặc biệt: \\ / : * ? " < > |',
      status_astyle_formatted: 'Đã định dạng mã nguồn (AStyle Allman)',
      status_saved_vfs: 'Đã lưu code và toàn bộ files vào trình duyệt!',
      status_saved_all: 'Đã lưu toàn bộ file trong dự án!',
      status_renamed_proj: 'Đã đổi tên dự án thành "{name}"',
      status_all_files_closed: 'Đã đóng tất cả các file.',
      status_file_opened: 'Đã mở file: {name}',
      status_zipping_project: 'Đang nén toàn bộ project ra file .ZIP...',
      status_zipped_success: 'Đã tải xuống file .ZIP của dự án!',
      status_empty_open_files: '(Không có file nào đang mở)',
      status_empty_classes: '(Không có class nào được định nghĩa)',
      status_input_cleared: 'Đã xóa trống tab Input!',
      status_input_loaded: 'Đã nạp dữ liệu mẫu vào tab Input!',
      status_input_no_sample: 'Bài này không có dữ liệu mẫu.',
      status_busy_task: 'Đang thực thi tác vụ khác...',
      status_rebuilding_all: 'Đang Rebuild toàn bộ dự án...',
      status_state_saved: 'Đã lưu trạng thái dự án',
      btn_copied: 'Đã sao chép',
      tab_close_file: 'Đóng file'
    }
  };

  const I18N = {
    _currentLocale: 'en',
    _listeners: [],

    init() {
      const saved = localStorage.getItem(STORAGE_KEY);
      this._currentLocale = (saved === 'vi' || saved === 'en') ? saved : 'en';
      this.apply();
      this._updateMenuCheckmarks();
    },

    getLocale() {
      return this._currentLocale;
    },

    setLocale(lang) {
      if (lang !== 'en' && lang !== 'vi') return;
      this._currentLocale = lang;
      localStorage.setItem(STORAGE_KEY, lang);
      this.apply();
      this._updateMenuCheckmarks();
      this._notifyListeners();
    },

    t(key, params = {}) {
      const dict = TRANSLATIONS[this._currentLocale] || TRANSLATIONS.en;
      let text = dict[key] || TRANSLATIONS.en[key] || key;
      if (typeof text === 'string') {
        for (const p in params) {
          text = text.replace(new RegExp('\\{' + p + '\\}', 'g'), params[p]);
        }
      }
      return text;
    },

    onLocaleChange(fn) {
      if (typeof fn === 'function') {
        this._listeners.push(fn);
      }
    },

    _notifyListeners() {
      this._listeners.forEach(fn => {
        try { fn(this._currentLocale); } catch (e) { console.error('i18n listener error:', e); }
      });
    },

    _updateMenuCheckmarks() {
      const checkEn = document.getElementById('icon-check-lang-en');
      const checkVi = document.getElementById('icon-check-lang-vi');
      if (checkEn) {
        checkEn.style.visibility = (this._currentLocale === 'en') ? 'visible' : 'hidden';
      }
      if (checkVi) {
        checkVi.style.visibility = (this._currentLocale === 'vi') ? 'visible' : 'hidden';
      }
      const elLangSelect = document.getElementById('select-language');
      if (elLangSelect && elLangSelect.value !== this._currentLocale) {
        elLangSelect.value = this._currentLocale;
        elLangSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      document.documentElement.lang = this._currentLocale;
    },

    apply() {
      const elements = document.querySelectorAll('[data-i18n]');
      elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key) {
          const val = this.t(key);
          if (typeof val === 'string' && val.includes('<') && val.includes('>')) {
            el.innerHTML = val;
          } else {
            el.textContent = val;
          }
        }
      });

      const htmlElements = document.querySelectorAll('[data-i18n-html]');
      htmlElements.forEach(el => {
        const key = el.getAttribute('data-i18n-html');
        if (key) {
          el.innerHTML = this.t(key);
        }
      });

      const titleElements = document.querySelectorAll('[data-i18n-title]');
      titleElements.forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (key) {
          el.setAttribute('title', this.t(key));
        }
      });

      const phElements = document.querySelectorAll('[data-i18n-placeholder]');
      phElements.forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (key) {
          el.setAttribute('placeholder', this.t(key));
        }
      });
    }
  };

  window.I18N = I18N;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => I18N.init());
  } else {
    I18N.init();
  }

})(window);
