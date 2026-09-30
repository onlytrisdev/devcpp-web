/**
 * Dev-C++ 5.11 Web Edition - Intelligent C/C++ Code Assistance & Autocomplete Engine
 * Features:
 * - Dynamic Struct & Class Member Parsing from current document and project headers (.h/.hpp)
 * - Deep Type Inference for variable declarations (Node* p, SinhVien sv, etc.)
 * - Chained Member Access (p->next->next->val, root->left->data)
 * - Comprehensive C++ STL Container Completion (vector, string, queue, stack, map, set, pair)
 * - Scope Resolution Completion (std::cout, std::cin, std::endl, std::sort...)
 * - Preprocessor Header Completion (#include <iostream>, #include "calc.h")
 * - DSA & Linked List Snippets (struct Node, ll-traverse, insertHead, etc.)
 * - User Configurable ON / OFF Toggle with persistence
 */

(function (window) {
  'use strict';

  // STL Method Catalogs
  const STL_MEMBERS = {
    vector: [
      { name: 'push_back', kind: 'Method', detail: 'void push_back(const T& val)', doc: 'Thêm phần tử vào cuối vector' },
      { name: 'pop_back', kind: 'Method', detail: 'void pop_back()', doc: 'Xóa phần tử cuối cùng' },
      { name: 'size', kind: 'Method', detail: 'size_t size() const', doc: 'Trả về số lượng phần tử hiện có' },
      { name: 'empty', kind: 'Method', detail: 'bool empty() const', doc: 'Kiểm tra vector có rỗng không' },
      { name: 'clear', kind: 'Method', detail: 'void clear()', doc: 'Xóa toàn bộ phần tử trong vector' },
      { name: 'begin', kind: 'Method', detail: 'iterator begin()', doc: 'Trả về iterator trỏ đến đầu vector' },
      { name: 'end', kind: 'Method', detail: 'iterator end()', doc: 'Trả về iterator trỏ đến sau phần tử cuối' },
      { name: 'front', kind: 'Method', detail: 'T& front()', doc: 'Trả về tham chiếu đến phần tử đầu tiên' },
      { name: 'back', kind: 'Method', detail: 'T& back()', doc: 'Trả về tham chiếu đến phần tử cuối cùng' },
      { name: 'at', kind: 'Method', detail: 'T& at(size_t pos)', doc: 'Truy cập phần tử có kiểm tra biên giới hạn' },
      { name: 'insert', kind: 'Method', detail: 'iterator insert(const_iterator pos, const T& val)', doc: 'Chèn phần tử vào vị trí chỉ định' },
      { name: 'erase', kind: 'Method', detail: 'iterator erase(const_iterator pos)', doc: 'Xóa phần tử tại vị trí chỉ định' },
      { name: 'resize', kind: 'Method', detail: 'void resize(size_t count)', doc: 'Thay đổi kích thước vector' },
      { name: 'capacity', kind: 'Method', detail: 'size_t capacity() const', doc: 'Trả về dung lượng bộ nhớ đã cấp phát' }
    ],
    string: [
      { name: 'length', kind: 'Method', detail: 'size_t length() const', doc: 'Trả về độ dài chuỗi ký tự' },
      { name: 'size', kind: 'Method', detail: 'size_t size() const', doc: 'Trả về số lượng ký tự trong chuỗi' },
      { name: 'empty', kind: 'Method', detail: 'bool empty() const', doc: 'Kiểm tra chuỗi có rỗng không' },
      { name: 'clear', kind: 'Method', detail: 'void clear()', doc: 'Xóa sạch nội dung chuỗi' },
      { name: 'substr', kind: 'Method', detail: 'string substr(size_t pos = 0, size_t count = npos) const', doc: 'Cắt chuỗi con từ vị trí pos' },
      { name: 'find', kind: 'Method', detail: 'size_t find(const string& str, size_t pos = 0) const', doc: 'Tìm kiếm chuỗi con đầu tiên' },
      { name: 'rfind', kind: 'Method', detail: 'size_t rfind(const string& str, size_t pos = npos) const', doc: 'Tìm kiếm chuỗi con ngược từ cuối' },
      { name: 'c_str', kind: 'Method', detail: 'const char* c_str() const', doc: 'Trả về con trỏ mảng ký tự kiểu C kết thúc bằng null' },
      { name: 'push_back', kind: 'Method', detail: 'void push_back(char c)', doc: 'Thêm 1 ký tự vào cuối chuỗi' },
      { name: 'pop_back', kind: 'Method', detail: 'void pop_back()', doc: 'Xóa 1 ký tự cuối chuỗi' },
      { name: 'append', kind: 'Method', detail: 'string& append(const string& str)', doc: 'Nối chuỗi vào cuối' },
      { name: 'insert', kind: 'Method', detail: 'string& insert(size_t pos, const string& str)', doc: 'Chèn chuỗi vào vị trí chỉ định' },
      { name: 'erase', kind: 'Method', detail: 'string& erase(size_t pos = 0, size_t count = npos)', doc: 'Xóa ký tự trong khoảng chỉ định' },
      { name: 'replace', kind: 'Method', detail: 'string& replace(size_t pos, size_t count, const string& str)', doc: 'Thay thế đoạn ký tự bằng chuỗi mới' },
      { name: 'compare', kind: 'Method', detail: 'int compare(const string& str) const', doc: 'So sánh thứ tự từ điển với chuỗi khác' },
      { name: 'front', kind: 'Method', detail: 'char& front()', doc: 'Ký tự đầu tiên' },
      { name: 'back', kind: 'Method', detail: 'char& back()', doc: 'Ký tự cuối cùng' }
    ],
    queue: [
      { name: 'push', kind: 'Method', detail: 'void push(const T& val)', doc: 'Thêm phần tử vào cuối hàng đợi (FIFO)' },
      { name: 'pop', kind: 'Method', detail: 'void pop()', doc: 'Loại bỏ phần tử ở đầu hàng đợi' },
      { name: 'front', kind: 'Method', detail: 'T& front()', doc: 'Truy cập phần tử ở đầu hàng đợi' },
      { name: 'back', kind: 'Method', detail: 'T& back()', doc: 'Truy cập phần tử ở cuối hàng đợi' },
      { name: 'empty', kind: 'Method', detail: 'bool empty() const', doc: 'Kiểm tra hàng đợi có rỗng không' },
      { name: 'size', kind: 'Method', detail: 'size_t size() const', doc: 'Số lượng phần tử trong hàng đợi' }
    ],
    stack: [
      { name: 'push', kind: 'Method', detail: 'void push(const T& val)', doc: 'Đẩy phần tử lên đỉnh ngăn xếp (LIFO)' },
      { name: 'pop', kind: 'Method', detail: 'void pop()', doc: 'Lấy phần tử ra khỏi đỉnh ngăn xếp' },
      { name: 'top', kind: 'Method', detail: 'T& top()', doc: 'Truy cập phần tử trên đỉnh ngăn xếp' },
      { name: 'empty', kind: 'Method', detail: 'bool empty() const', doc: 'Kiểm tra ngăn xếp có rỗng không' },
      { name: 'size', kind: 'Method', detail: 'size_t size() const', doc: 'Số lượng phần tử trong ngăn xếp' }
    ],
    priority_queue: [
      { name: 'push', kind: 'Method', detail: 'void push(const T& val)', doc: 'Thêm phần tử vào hàng đợi ưu tiên (Heap)' },
      { name: 'pop', kind: 'Method', detail: 'void pop()', doc: 'Loại bỏ phần tử có độ ưu tiên cao nhất' },
      { name: 'top', kind: 'Method', detail: 'const T& top() const', doc: 'Truy cập phần tử có độ ưu tiên cao nhất' },
      { name: 'empty', kind: 'Method', detail: 'bool empty() const', doc: 'Kiểm tra có rỗng không' },
      { name: 'size', kind: 'Method', detail: 'size_t size() const', doc: 'Số lượng phần tử hiện tại' }
    ],
    map: [
      { name: 'insert', kind: 'Method', detail: 'pair<iterator, bool> insert(const value_type& val)', doc: 'Chèn cặp key-value' },
      { name: 'erase', kind: 'Method', detail: 'size_t erase(const Key& key)', doc: 'Xóa phần tử theo khóa key' },
      { name: 'find', kind: 'Method', detail: 'iterator find(const Key& key)', doc: 'Tìm kiếm phần tử theo khóa key' },
      { name: 'count', kind: 'Method', detail: 'size_t count(const Key& key) const', doc: 'Đếm số lượng khóa key (0 hoặc 1)' },
      { name: 'size', kind: 'Method', detail: 'size_t size() const', doc: 'Số lượng cặp key-value trong map' },
      { name: 'empty', kind: 'Method', detail: 'bool empty() const', doc: 'Kiểm tra map có rỗng không' },
      { name: 'clear', kind: 'Method', detail: 'void clear()', doc: 'Xóa toàn bộ phần tử trong map' },
      { name: 'begin', kind: 'Method', detail: 'iterator begin()', doc: 'Iterator trỏ đến phần tử nhỏ nhất' },
      { name: 'end', kind: 'Method', detail: 'iterator end()', doc: 'Iterator trỏ đến sau phần tử lớn nhất' }
    ],
    set: [
      { name: 'insert', kind: 'Method', detail: 'pair<iterator, bool> insert(const value_type& val)', doc: 'Thêm phần tử vào tập hợp' },
      { name: 'erase', kind: 'Method', detail: 'size_t erase(const Key& key)', doc: 'Xóa phần tử khỏi tập hợp' },
      { name: 'find', kind: 'Method', detail: 'iterator find(const Key& key)', doc: 'Tìm kiếm phần tử' },
      { name: 'count', kind: 'Method', detail: 'size_t count(const Key& key) const', doc: 'Kiểm tra phần tử có tồn tại không (0 hoặc 1)' },
      { name: 'size', kind: 'Method', detail: 'size_t size() const', doc: 'Số lượng phần tử trong set' },
      { name: 'empty', kind: 'Method', detail: 'bool empty() const', doc: 'Kiểm tra set có rỗng không' },
      { name: 'clear', kind: 'Method', detail: 'void clear()', doc: 'Xóa toàn bộ phần tử trong set' },
      { name: 'begin', kind: 'Method', detail: 'iterator begin()', doc: 'Iterator trỏ đến phần tử nhỏ nhất' },
      { name: 'end', kind: 'Method', detail: 'iterator end()', doc: 'Iterator trỏ đến sau phần tử lớn nhất' }
    ],
    pair: [
      { name: 'first', kind: 'Field', detail: 'T1 first', doc: 'Phần tử thứ nhất trong cặp' },
      { name: 'second', kind: 'Field', detail: 'T2 second', doc: 'Phần tử thứ hai trong cặp' }
    ]
  };

  // Standard std:: Namespace Members
  const STD_MEMBERS = [
    { name: 'cout', kind: 'Variable', detail: 'std::ostream cout', doc: 'Luồng xuất chuẩn (Standard output stream)' },
    { name: 'cin', kind: 'Variable', detail: 'std::istream cin', doc: 'Luồng nhập chuẩn (Standard input stream)' },
    { name: 'endl', kind: 'Function', detail: 'std::endl', doc: 'Ký tự xuống dòng kèm xả bộ đệm (flush buffer)' },
    { name: 'vector', kind: 'Class', detail: 'std::vector<T>', doc: 'Mảng động (Dynamic Array Container)' },
    { name: 'string', kind: 'Class', detail: 'std::string', doc: 'Chuỗi ký tự chuẩn C++' },
    { name: 'pair', kind: 'Class', detail: 'std::pair<T1, T2>', doc: 'Cấu trúc lưu trữ cặp 2 giá trị' },
    { name: 'make_pair', kind: 'Function', detail: 'make_pair(a, b)', doc: 'Hàm tạo nhanh một đối tượng std::pair' },
    { name: 'sort', kind: 'Function', detail: 'sort(RandomIt first, RandomIt last)', doc: 'Sắp xếp dãy phần tử tăng dần (IntroSort)' },
    { name: 'reverse', kind: 'Function', detail: 'reverse(BidirIt first, BidirIt last)', doc: 'Đảo ngược thứ tự các phần tử' },
    { name: 'max', kind: 'Function', detail: 'max(a, b)', doc: 'Trả về giá trị lớn nhất giữa hai số' },
    { name: 'min', kind: 'Function', detail: 'min(a, b)', doc: 'Trả về giá trị nhỏ nhất giữa hai số' },
    { name: 'swap', kind: 'Function', detail: 'swap(a, b)', doc: 'Hoán đổi giá trị của hai biến' },
    { name: 'abs', kind: 'Function', detail: 'abs(x)', doc: 'Giá trị tuyệt đối của số x' },
    { name: 'sqrt', kind: 'Function', detail: 'sqrt(x)', doc: 'Căn bậc hai của số thực x' },
    { name: 'pow', kind: 'Function', detail: 'pow(base, exp)', doc: 'Hàm tính lũy thừa base^exp' },
    { name: 'to_string', kind: 'Function', detail: 'to_string(value)', doc: 'Chuyển đổi số thành chuỗi std::string' },
    { name: 'stoi', kind: 'Function', detail: 'stoi(str)', doc: 'Chuyển chuỗi thành số nguyên (int)' },
    { name: 'stod', kind: 'Function', detail: 'stod(str)', doc: 'Chuyển chuỗi thành số thực (double)' },
    { name: 'getline', kind: 'Function', detail: 'getline(is, str)', doc: 'Đọc cả dòng văn bản từ luồng nhập' },
    { name: 'queue', kind: 'Class', detail: 'std::queue<T>', doc: 'Hàng đợi FIFO' },
    { name: 'stack', kind: 'Class', detail: 'std::stack<T>', doc: 'Ngăn xếp LIFO' },
    { name: 'priority_queue', kind: 'Class', detail: 'std::priority_queue<T>', doc: 'Hàng đợi ưu tiên (Max/Min Heap)' },
    { name: 'map', kind: 'Class', detail: 'std::map<Key, Val>', doc: 'Bảng ánh xạ key-value (Red-Black tree)' },
    { name: 'set', kind: 'Class', detail: 'std::set<T>', doc: 'Tập hợp các phần tử không trùng lặp' },
    { name: 'fixed', kind: 'Function', detail: 'std::fixed', doc: 'Định dạng in số thực theo dấu phẩy tĩnh' },
    { name: 'setprecision', kind: 'Function', detail: 'setprecision(n)', doc: 'Thiết lập độ chính xác chữ số thập phân' },
    { name: 'greater', kind: 'Struct', detail: 'std::greater<T>()', doc: 'Toán tử so sánh lớn hơn (dùng cho sort/priority_queue)' },
    { name: 'less', kind: 'Struct', detail: 'std::less<T>()', doc: 'Toán tử so sánh bé hơn' }
  ];

  // Standard C/C++ Headers Catalog
  const STD_HEADERS = [
    { name: 'iostream', doc: 'Nhập xuất luồng chuẩn C++ (cin, cout, cerr, endl)' },
    { name: 'vector', doc: 'Mảng động std::vector' },
    { name: 'string', doc: 'Chuỗi ký tự std::string' },
    { name: 'algorithm', doc: 'Các thuật toán chuẩn (sort, reverse, min, max, binary_search)' },
    { name: 'cmath', doc: 'Các hàm toán học (sqrt, pow, sin, cos, abs, ceil, floor)' },
    { name: 'cstdio', doc: 'Nhập xuất chuẩn ngôn ngữ C (printf, scanf, sprintf)' },
    { name: 'cstdlib', doc: 'Thư viện tiện ích chuẩn C (malloc, free, rand, exit, atoi)' },
    { name: 'cstring', doc: 'Xử lý mảng ký tự C (strlen, strcpy, strcmp, memset)' },
    { name: 'queue', doc: 'Cấu trúc dữ liệu hàng đợi queue & priority_queue' },
    { name: 'stack', doc: 'Cấu trúc dữ liệu ngăn xếp stack' },
    { name: 'map', doc: 'Cấu trúc ánh xạ cây std::map và std::multimap' },
    { name: 'set', doc: 'Tập hợp có thứ tự std::set và std::multiset' },
    { name: 'utility', doc: 'Tiện ích std::pair, std::make_pair, std::swap' },
    { name: 'iomanip', doc: 'Định dạng hiển thị số thực (setw, setprecision, fixed)' },
    { name: 'sstream', doc: 'Luồng chuỗi ký tự std::stringstream' },
    { name: 'cassert', doc: 'Hàm khẳng định điều kiện assert()' },
    { name: 'climits', doc: 'Hằng số giới hạn kiểu số nguyên (INT_MAX, INT_MIN)' },
    { name: 'cctype', doc: 'Kiểm tra phân loại ký tự (isalpha, isdigit, tolower)' },
    { name: 'memory', doc: 'Con trỏ thông minh (std::unique_ptr, std::shared_ptr)' }
  ];

  // Common Linked List / DSA Struct Fallback Field Names
  const COMMON_DSA_FIELDS = [
    { name: 'data', type: 'int', kind: 'Field', doc: 'Dữ liệu lưu trữ trong Node' },
    { name: 'val', type: 'int', kind: 'Field', doc: 'Giá trị của Node' },
    { name: 'key', type: 'int', kind: 'Field', doc: 'Khóa định danh Node' },
    { name: 'next', type: 'Node*', kind: 'Field', doc: 'Con trỏ trỏ đến Node tiếp theo trong danh sách' },
    { name: 'prev', type: 'Node*', kind: 'Field', doc: 'Con trỏ trỏ đến Node phía trước (Danh sách liên kết đôi)' },
    { name: 'left', type: 'Node*', kind: 'Field', doc: 'Con trỏ nhánh cây con bên trái (Binary Tree)' },
    { name: 'right', type: 'Node*', kind: 'Field', doc: 'Con trỏ nhánh cây con bên phải (Binary Tree)' },
    { name: 'pHead', type: 'Node*', kind: 'Field', doc: 'Con trỏ đầu danh sách liên kết' },
    { name: 'pTail', type: 'Node*', kind: 'Field', doc: 'Con trỏ cuối danh sách liên kết' },
    { name: 'pNext', type: 'Node*', kind: 'Field', doc: 'Con trỏ kế tiếp (chuẩn giáo trình)' },
    { name: 'head', type: 'Node*', kind: 'Field', doc: 'Con trỏ đầu danh sách' },
    { name: 'tail', type: 'Node*', kind: 'Field', doc: 'Con trỏ cuối danh sách' },
    { name: 'size', type: 'int', kind: 'Field', doc: 'Số lượng phần tử trong danh sách' },
    { name: 'count', type: 'int', kind: 'Field', doc: 'Đếm số lượng phần tử' }
  ];

  // Code Snippets for C/C++ & DSA
  const DSA_SNIPPETS = [
    {
      label: 'node',
      insertText: 'struct ${1:Node} {\n\t${2:int} ${3:data};\n\t${1:Node}* ${4:next};\n\t${1:Node}(${2:int} val = 0) : ${3:data}(val), ${4:next}(nullptr) {}\n};',
      detail: 'Snippet: Cấu trúc Node cho Danh sách liên kết đơn',
      doc: 'Tạo nhanh struct Node với dữ liệu, con trỏ next và constructor khởi tạo'
    },
    {
      label: 'dnode',
      insertText: 'struct ${1:DNode} {\n\t${2:int} ${3:data};\n\t${1:DNode}* ${4:prev};\n\t${1:DNode}* ${5:next};\n\t${1:DNode}(${2:int} val = 0) : ${3:data}(val), ${4:prev}(nullptr), ${5:next}(nullptr) {}\n};',
      detail: 'Snippet: Cấu trúc Node cho Danh sách liên kết đôi',
      doc: 'Tạo nhanh struct Node có cả 2 con trỏ prev và next'
    },
    {
      label: 'treenode',
      insertText: 'struct ${1:TreeNode} {\n\t${2:int} ${3:val};\n\t${1:TreeNode}* ${4:left};\n\t${1:TreeNode}* ${5:right};\n\t${1:TreeNode}(${2:int} x = 0) : ${3:val}(x), ${4:left}(nullptr), ${5:right}(nullptr) {}\n};',
      detail: 'Snippet: Cấu trúc TreeNode cho Cây nhị phân',
      doc: 'Tạo nhanh struct Node có giá trị val và 2 nhánh cây con left / right'
    },
    {
      label: 'll-traverse',
      insertText: 'for (${1:Node}* ${2:cur} = ${3:head}; ${2:cur} != nullptr; ${2:cur} = ${2:cur}->next) {\n\t${0}\n}',
      detail: 'Snippet: Vòng lặp duyệt Danh sách liên kết',
      doc: 'Duyệt tuần tự từ head đến cuối danh sách liên kết qua con trỏ cur->next'
    },
    {
      label: 'll-print',
      insertText: 'void printList(${1:Node}* head) {\n\tfor (${1:Node}* cur = head; cur != nullptr; cur = cur->next) {\n\t\tstd::cout << cur->data << " -> ";\n\t}\n\tstd::cout << "NULL\\n";\n}',
      detail: 'Snippet: Hàm in Danh sách liên kết ra màn hình',
      doc: 'In tuần tự các phần tử dạng: 1 -> 2 -> 3 -> NULL'
    },
    {
      label: 'll-insert-head',
      insertText: 'void insertHead(${1:Node}*& head, int val) {\n\t${1:Node}* newNode = new ${1:Node}(val);\n\tnewNode->next = head;\n\thead = newNode;\n}',
      detail: 'Snippet: Chèn Node vào đầu Danh sách liên kết',
      doc: 'Chèn giá trị mới val vào vị trí đầu tiên của danh sách'
    },
    {
      label: 'll-insert-tail',
      insertText: 'void insertTail(${1:Node}*& head, int val) {\n\t${1:Node}* newNode = new ${1:Node}(val);\n\tif (!head) {\n\t\thead = newNode;\n\t\treturn;\n\t}\n\t${1:Node}* cur = head;\n\twhile (cur->next) {\n\t\tcur = cur->next;\n\t}\n\tcur->next = newNode;\n}',
      detail: 'Snippet: Chèn Node vào cuối Danh sách liên kết',
      doc: 'Chèn giá trị mới val vào cuối danh sách liên kết'
    },
    {
      label: 'main',
      insertText: 'int main() {\n\tstd::ios_base::sync_with_stdio(false);\n\tstd::cin.tie(NULL);\n\t${0}\n\treturn 0;\n}',
      detail: 'Snippet: Hàm main() chuẩn tốc độ cao',
      doc: 'Khởi tạo hàm main() với tăng tốc nhập xuất I/O'
    },
    {
      label: 'fori',
      insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ++${1:i}) {\n\t${0}\n}',
      detail: 'Snippet: Vòng lặp for tăng dần i++',
      doc: 'Khung lặp for cơ bản từ 0 đến n'
    }
  ];

  /**
   * Main IntelliSense Controller
   */
  const DevCPPIntelliSense = {
    _isEnabled: true,
    _registered: false,

    init() {
      // 1. Read persistent state from localStorage
      const saved = localStorage.getItem('devcpp_intellisense_enabled');
      this._isEnabled = saved !== 'false'; // default true

      // 2. Register Monaco completion providers when Monaco is loaded
      if (window.monaco && window.monaco.languages) {
        this.registerMonacoProviders();
      } else {
        // Wait for monaco
        const timer = setInterval(() => {
          if (window.monaco && window.monaco.languages) {
            clearInterval(timer);
            this.registerMonacoProviders();
          }
        }, 150);
      }

      // 3. Bind UI toggle in Tools menu
      this._bindToggleUI();
    },

    isEnabled() {
      return this._isEnabled;
    },

    setEnabled(enabled) {
      this._isEnabled = !!enabled;
      localStorage.setItem('devcpp_intellisense_enabled', this._isEnabled ? 'true' : 'false');
      this._updateUIState();

      if (window.editor) {
        window.editor.updateOptions({
          quickSuggestions: this._isEnabled,
          suggestOnTriggerCharacters: this._isEnabled,
          snippetSuggestions: this._isEnabled ? 'inline' : 'none',
          wordBasedSuggestions: this._isEnabled ? 'allDocuments' : 'off'
        });
      }

      if (typeof window.updateStatus === 'function') {
        window.updateStatus('ready', this._isEnabled ? 'Gợi ý code (IntelliSense): Đã BẬT' : 'Gợi ý code (IntelliSense): Đã TẮT');
      }
    },

    toggle() {
      this.setEnabled(!this._isEnabled);
    },

    _bindToggleUI() {
      const row = document.getElementById('m-tool-toggle-intellisense');
      if (row) {
        row.addEventListener('click', () => {
          this.toggle();
        });
      }

      // Keyboard shortcut Alt+I to toggle
      window.addEventListener('keydown', (e) => {
        if (e.altKey && (e.key === 'i' || e.key === 'I')) {
          e.preventDefault();
          this.toggle();
        }
      });

      this._updateUIState();
    },

    _updateUIState() {
      const icon = document.getElementById('icon-check-intellisense');
      if (icon) {
        icon.style.visibility = this._isEnabled ? 'visible' : 'hidden';
      }
    },

    /**
     * Collect all C/C++ source and header code from active model and VFS project
     */
    getAllCodeSources(currentModel) {
      let sources = [];
      if (currentModel) {
        sources.push(currentModel.getValue());
      }

      if (window.vfs && window.vfs.project && window.vfs.project.nodes) {
        for (const id in window.vfs.project.nodes) {
          const node = window.vfs.project.nodes[id];
          if (node && node.type === 'file' && (node.name.endsWith('.h') || node.name.endsWith('.hpp') || node.name.endsWith('.cpp') || node.name.endsWith('.c'))) {
            if (node.content) {
              sources.push(node.content);
            }
          }
        }
      }

      return sources.join('\n\n');
    },

    /**
     * Parse all user-defined structs and classes from C/C++ source code
     */
    parseStructsAndClasses(code) {
      const structs = {};
      if (!code) return structs;

      // Clean comments and string literals to prevent false positives
      const cleanCode = code
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/\/\/.*/g, ' ')
        .replace(/"(?:[^"\\]|\\.)*"/g, '""');

      // Match: struct/class Name { ... } [alias];
      // or typedef struct Name? { ... } Alias;
      const structRegex = /(?:typedef\s+)?(?:struct|class)\s*([A-Za-z0-9_]*)\s*\{([^}]*)\}\s*([A-Za-z0-9_,\s*]*);/g;
      let match;

      while ((match = structRegex.exec(cleanCode)) !== null) {
        const rawName = match[1] ? match[1].trim() : '';
        const body = match[2];
        const aliases = match[3] ? match[3].split(',').map(s => s.trim().replace(/^[*&]/, '')) : [];

        const fields = [];
        const lines = body.split(';');

        lines.forEach(line => {
          line = line.trim();
          if (!line || line.startsWith('public:') || line.startsWith('private:') || line.startsWith('protected:')) return;

          // Check if it's a method declaration: returnType name(params)
          const methodMatch = line.match(/^([A-Za-z0-9_:*&\s]+)\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)/);
          if (methodMatch) {
            const ret = methodMatch[1].trim();
            const methodName = methodMatch[2].trim();
            fields.push({
              name: methodName,
              type: ret,
              kind: 'Method',
              detail: `${ret} ${methodName}(${methodMatch[3].trim()})`,
              doc: `Phương thức của ${rawName || 'struct'}`
            });
            return;
          }

          // Variable field: e.g. int val, Node* next, float a, b, c;
          const fieldTokens = line.split(/\s+/);
          if (fieldTokens.length >= 2) {
            // Primitive or struct type
            const typePart = fieldTokens.slice(0, fieldTokens.length - 1).join(' ').trim();
            const namesPart = fieldTokens[fieldTokens.length - 1].trim();

            const varNames = namesPart.split(',').map(s => s.trim().replace(/^[*&]/, ''));
            varNames.forEach(vName => {
              if (vName && /^[A-Za-z0-9_]+$/.test(vName)) {
                fields.push({
                  name: vName,
                  type: typePart,
                  kind: 'Field',
                  detail: `${typePart} ${vName}`,
                  doc: `Trường dữ liệu thuộc ${rawName || 'struct'}`
                });
              }
            });
          }
        });

        const structObj = {
          name: rawName,
          fields: fields
        };

        if (rawName) structs[rawName] = structObj;
        aliases.forEach(alias => {
          if (alias && /^[A-Za-z0-9_]+$/.test(alias)) {
            structs[alias] = structObj;
          }
        });
      }

      return structs;
    },

    /**
     * Resolve variable declarations in current scope before cursor
     */
    resolveVariableType(varName, codeBeforeCursor, declaredStructs) {
      if (!varName || !codeBeforeCursor) return null;

      // 1. Check for standard STL declarations
      // vector<int> v;  vector<Node*> list;
      const vectorRegex = new RegExp(`vector\\s*<[^>]+>\\s+[*&]?\\s*${varName}\\b`);
      if (vectorRegex.test(codeBeforeCursor)) return 'vector';

      // string s;
      const stringRegex = new RegExp(`(?:std::)?string\\s+[*&]?\\s*${varName}\\b`);
      if (stringRegex.test(codeBeforeCursor)) return 'string';

      // queue<int> q;
      const queueRegex = new RegExp(`(?:std::)?queue\\s*<[^>]+>\\s+[*&]?\\s*${varName}\\b`);
      if (queueRegex.test(codeBeforeCursor)) return 'queue';

      // stack<int> st;
      const stackRegex = new RegExp(`(?:std::)?stack\\s*<[^>]+>\\s+[*&]?\\s*${varName}\\b`);
      if (stackRegex.test(codeBeforeCursor)) return 'stack';

      // priority_queue<int> pq;
      const pqRegex = new RegExp(`(?:std::)?priority_queue\\s*<[^>]+>\\s+[*&]?\\s*${varName}\\b`);
      if (pqRegex.test(codeBeforeCursor)) return 'priority_queue';

      // map<string, int> mp;
      const mapRegex = new RegExp(`(?:std::)?(?:unordered_)?map\\s*<[^>]+>\\s+[*&]?\\s*${varName}\\b`);
      if (mapRegex.test(codeBeforeCursor)) return 'map';

      // set<int> st;
      const setRegex = new RegExp(`(?:std::)?(?:unordered_)?set\\s*<[^>]+>\\s+[*&]?\\s*${varName}\\b`);
      if (setRegex.test(codeBeforeCursor)) return 'set';

      // pair<int, int> p;
      const pairRegex = new RegExp(`(?:std::)?pair\\s*<[^>]+>\\s+[*&]?\\s*${varName}\\b`);
      if (pairRegex.test(codeBeforeCursor)) return 'pair';

      // 2. Check for user-defined structs / classes
      // Match patterns:
      // Node* p = new Node();
      // Node *cur = head;
      // Node p;
      // SinhVien sv;
      // void xuat(Node* head)
      for (const sName in declaredStructs) {
        const regex = new RegExp(`(?:struct\\s+)?\\b${sName}\\b\\s*[*&]*\\s*[*&]?\\b${varName}\\b`);
        if (regex.test(codeBeforeCursor)) {
          return sName;
        }
      }

      // 3. Heuristic for common DSA variable names:
      // head, tail, cur, p, node, root, pHead, pTail -> default to the first declared linked list or tree struct
      const dsaHeuristicNames = ['head', 'tail', 'cur', 'node', 'p', 'q', 'root', 'phead', 'ptail', 'pnext', 'current'];
      if (dsaHeuristicNames.includes(varName.toLowerCase())) {
        for (const sName in declaredStructs) {
          const s = declaredStructs[sName];
          const hasNext = s.fields.some(f => f.name === 'next' || f.name === 'pNext' || f.name === 'left');
          if (hasNext) return sName;
        }
      }

      return null;
    },

    /**
     * Resolve chained member access type: e.g. p->next->
     */
    resolveChainType(chainTokens, codeBeforeCursor, declaredStructs) {
      if (!chainTokens || chainTokens.length === 0) return null;

      // Base variable
      let curType = this.resolveVariableType(chainTokens[0], codeBeforeCursor, declaredStructs);
      if (!curType) return null;

      // Follow property chains
      for (let i = 1; i < chainTokens.length; i++) {
        const propName = chainTokens[i];
        if (!curType || !declaredStructs[curType]) {
          return null;
        }

        const structDef = declaredStructs[curType];
        const field = structDef.fields.find(f => f.name === propName);
        if (!field) {
          return null;
        }

        // Clean field type: e.g. "Node*" -> "Node"
        const cleanFieldType = field.type.replace(/[*&\s]/g, '').replace(/^struct\s+/, '');
        if (declaredStructs[cleanFieldType]) {
          curType = cleanFieldType;
        } else if (STL_MEMBERS[cleanFieldType]) {
          curType = cleanFieldType;
        } else {
          curType = null;
        }
      }

      return curType;
    },

    parseCustomTypes(code) {
      return this.parseStructsAndClasses(code);
    },

    /**
     * Provide completion suggestions for Monaco Editor
     */
    provideCompletionItems(model, position, context) {
      if (!this._isEnabled) {
        return { suggestions: [] };
      }

      const monaco = window.monaco;
      const self = this;

          const lineContent = model.getLineContent(position.lineNumber);
          const textBeforeCursor = lineContent.substring(0, position.column - 1);
          const fullCode = self.getAllCodeSources(model);
          const codeBeforeCursor = model.getValueInRange({
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column
          });

          // 1. Check for Scope Resolution: std::
          if (textBeforeCursor.endsWith('::')) {
            const scopePrefix = textBeforeCursor.replace(/::$/, '').trim();
            if (scopePrefix === 'std' || scopePrefix.endsWith('std')) {
              const suggestions = STD_MEMBERS.map(m => ({
                label: m.name,
                kind: monaco.languages.CompletionItemKind[m.kind] || monaco.languages.CompletionItemKind.Function,
                detail: m.detail,
                documentation: m.doc,
                insertText: m.name,
                sortText: '00_' + m.name
              }));
              return { suggestions };
            }
          }

          // 2. Check for Header Include: #include <...> or #include "..."
          const includeAngleMatch = textBeforeCursor.match(/#\s*include\s*<([^>]*)$/);
          if (includeAngleMatch) {
            const suggestions = STD_HEADERS.map(h => ({
              label: h.name,
              kind: monaco.languages.CompletionItemKind.Module,
              detail: `<${h.name}>`,
              documentation: h.doc,
              insertText: h.name + '>',
              sortText: '00_' + h.name
            }));
            return { suggestions };
          }

          const includeQuoteMatch = textBeforeCursor.match(/#\s*include\s*"([^"]*)$/);
          if (includeQuoteMatch) {
            const headerFiles = [];
            if (window.vfs && window.vfs.project && window.vfs.project.nodes) {
              for (const id in window.vfs.project.nodes) {
                const node = window.vfs.project.nodes[id];
                if (node && node.type === 'file' && (node.name.endsWith('.h') || node.name.endsWith('.hpp'))) {
                  headerFiles.push({
                    label: node.name,
                    kind: monaco.languages.CompletionItemKind.File,
                    detail: `Dự án: ${node.path}`,
                    documentation: `File header nội bộ trong dự án Dev-C++`,
                    insertText: node.name + '"',
                    sortText: '00_' + node.name
                  });
                }
              }
            }
            return { suggestions: headerFiles };
          }

          // 3. Check for Member Access: . or ->
          const memberAccessMatch = textBeforeCursor.match(/([A-Za-z0-9_]+(?:\s*(?:->|\.)\s*[A-Za-z0-9_]+)*)\s*(->|\.)$/);
          if (memberAccessMatch) {
            const fullChain = memberAccessMatch[1].replace(/\s+/g, '');
            const operator = memberAccessMatch[2]; // '->' or '.'
            const chainTokens = fullChain.split(/->|\./);

            // Parse all structs from current file and project headers
            const declaredStructs = self.parseStructsAndClasses(fullCode);

            // Resolve target type
            const targetType = self.resolveChainType(chainTokens, codeBeforeCursor, declaredStructs);

            // A. Matched a User-Defined Struct
            if (targetType && declaredStructs[targetType]) {
              const structDef = declaredStructs[targetType];
              const suggestions = structDef.fields.map(f => ({
                label: f.name,
                kind: f.kind === 'Method' ? monaco.languages.CompletionItemKind.Method : monaco.languages.CompletionItemKind.Field,
                detail: f.detail,
                documentation: f.doc,
                insertText: f.name + (f.kind === 'Method' ? '()' : ''),
                sortText: '00_' + f.name
              }));
              return { suggestions };
            }

            // B. Matched an STL Container (vector, string, queue, etc.)
            if (targetType && STL_MEMBERS[targetType]) {
              const suggestions = STL_MEMBERS[targetType].map(m => ({
                label: m.name,
                kind: m.kind === 'Method' ? monaco.languages.CompletionItemKind.Method : monaco.languages.CompletionItemKind.Field,
                detail: m.detail,
                documentation: m.doc,
                insertText: m.name + (m.kind === 'Method' ? '()' : ''),
                sortText: '00_' + m.name
              }));
              return { suggestions };
            }

            // C. Intelligent Fallback for Linked Lists & Trees if chain contains pointer words (head, cur, p, next, etc.)
            const lastToken = chainTokens[chainTokens.length - 1].toLowerCase();
            const isLikelyDSA = ['head', 'tail', 'cur', 'node', 'p', 'q', 'next', 'prev', 'left', 'right'].includes(lastToken) || operator === '->';

            if (isLikelyDSA) {
              // Gather fields from all declared structs
              let collectedFields = [];
              for (const sName in declaredStructs) {
                collectedFields.push(...declaredStructs[sName].fields);
              }
              // If none declared, use standard DSA fields
              if (collectedFields.length === 0) {
                collectedFields = COMMON_DSA_FIELDS;
              }

              // Deduplicate fields by name
              const seen = new Set();
              const uniqueFields = [];
              for (const f of collectedFields) {
                if (!seen.has(f.name)) {
                  seen.add(f.name);
                  uniqueFields.push(f);
                }
              }

              const suggestions = uniqueFields.map(f => ({
                label: f.name,
                kind: f.kind === 'Method' ? monaco.languages.CompletionItemKind.Method : monaco.languages.CompletionItemKind.Field,
                detail: f.detail || `${f.type} ${f.name}`,
                documentation: f.doc || `Trường dữ liệu thuộc cấu trúc liên kết`,
                insertText: f.name + (f.kind === 'Method' ? '()' : ''),
                sortText: '00_' + f.name
              }));
              return { suggestions };
            }

            // If not DSA and unknown type, return empty so word-based doesn't flood
            return { suggestions: [] };
          }

          // 4. Default / Global Suggestions (Snippets, Keywords, Struct names)
          const declaredStructs = self.parseStructsAndClasses(fullCode);
          const suggestions = [];

          // Struct names
          for (const sName in declaredStructs) {
            suggestions.push({
              label: sName,
              kind: monaco.languages.CompletionItemKind.Struct,
              detail: `struct ${sName}`,
              documentation: `Kiểu dữ liệu cấu trúc tự định nghĩa (${declaredStructs[sName].fields.length} trường)`,
              insertText: sName,
              sortText: '01_' + sName
            });
          }

          // DSA Snippets
          DSA_SNIPPETS.forEach(snip => {
            suggestions.push({
              label: snip.label,
              kind: monaco.languages.CompletionItemKind.Snippet,
              detail: snip.detail,
              documentation: snip.doc,
              insertText: snip.insertText,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              sortText: '02_' + snip.label
            });
          });

          return { suggestions };
    },

    /**
     * Register Monaco Editor Completion Item Providers
     */
    registerMonacoProviders() {
      if (this._registered || !window.monaco || !window.monaco.languages) return;
      this._registered = true;

      const monaco = window.monaco;
      const self = this;

      const completionProvider = {
        triggerCharacters: ['.', '>', ':', '<', '"', '#'],
        provideCompletionItems(model, position, context) {
          return self.provideCompletionItems(model, position, context);
        }
      };

      monaco.languages.registerCompletionItemProvider('cpp', completionProvider);
      monaco.languages.registerCompletionItemProvider('c', completionProvider);
    }
  };

  window.DevCPPIntelliSense = DevCPPIntelliSense;

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => DevCPPIntelliSense.init());
  } else {
    DevCPPIntelliSense.init();
  }

})(window);
