/**
 * Dev-C++ Web Code Templates & Presets
 */

const CODE_TEMPLATES = [
  {
    id: 'array_1d',
    name: '1. Mảng 1D: Nhập xuất, Tìm kiếm & MaxMin (Bài thực tế)',
    description: 'Chương trình C chuẩn Đại học: Nhập mảng, xuất mảng, tìm kiếm phần tử, tìm Max Min',
    code: `/*
 * Dev-C++ Web Edition
 * Bài 1: Mảng 1 chiều - Nhập xuất, Tìm kiếm & Max Min
 */
#include <stdio.h>
#define MAX 100

void NhapMang(int a[], int n) {
    for (int i = 0; i < n; i++) {
        scanf("%d", &a[i]);
    }
}

void XuatMang(int a[], int n) {
    for (int i = 0; i < n; i++) {
        printf("%d ", a[i]);
    }
    printf("\\n");
}

int TimKiem(int a[], int n, int x) {
    for (int i = 0; i < n; i++) {
        if (a[i] == x) return i;
    }
    return -1;
}

void TimMaxMin(int a[], int n, int *maxVal, int *minVal) {
    *maxVal = a[0];
    *minVal = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] > *maxVal) *maxVal = a[i];
        if (a[i] < *minVal) *minVal = a[i];
    }
}

int main() {
    int a[MAX];
    int n;
    printf("Nhap so luong phan tu:\\n");
    if (scanf("%d", &n) != 1 || n <= 0 || n > MAX) {
        printf("So luong khong hop le!\\n");
        return 0;
    }
    
    printf("Nhap cac phan tu:\\n");
    NhapMang(a, n);
    
    printf("Mang vua nhap:\\n");
    XuatMang(a, n);
    
    int maxVal, minVal;
    TimMaxMin(a, n, &maxVal, &minVal);
    printf("Max = %d, Min = %d\\n", maxVal, minVal);
    
    int x;
    printf("Nhap gia tri can tim:\\n");
    if (scanf("%d", &x) == 1) {
        int pos = TimKiem(a, n, x);
        if (pos != -1) {
            printf("Tim thay %d tai vi tri index: %d\\n", x, pos);
        } else {
            printf("Khong tim thay %d trong mang\\n", x);
        }
    }
    
    return 0;
}
`,
    defaultStdin: "5\n12 45 8 90 23\n90\n",
    testcases: [
      {
        id: 1,
        name: 'Test 1: Tìm thấy 90 trong mảng',
        input: "5\n12 45 8 90 23\n90\n",
        expected: "Nhap so luong phan tu:\nNhap cac phan tu:\nMang vua nhap:\n12 45 8 90 23\nMax = 90, Min = 8\nNhap gia tri can tim:\nTim thay 90 tai vi tri index: 3"
      },
      {
        id: 2,
        name: 'Test 2: Không tìm thấy giá trị 99',
        input: "4\n10 20 30 40\n99\n",
        expected: "Nhap so luong phan tu:\nNhap cac phan tu:\nMang vua nhap:\n10 20 30 40\nMax = 40, Min = 10\nNhap gia tri can tim:\nKhong tim thay 99 trong mang"
      }
    ]
  },
  {
    id: 'matrix_2d',
    name: '2. Ma trận 2D: Tính tổng & Ma trận chuyển vị',
    description: 'Thao tác trên mảng 2 chiều: tính tổng phần tử và xuất ma trận chuyển vị',
    code: `/*
 * Dev-C++ Web Edition
 * Bài 2: Ma trận 2D - Tính tổng và Ma trận chuyển vị
 */
#include <stdio.h>
#define MAX 50

int main() {
    int r, c;
    if (scanf("%d %d", &r, &c) != 2 || r <= 0 || c <= 0) return 0;
    
    int a[MAX][MAX];
    int sum = 0;
    for (int i = 0; i < r; i++) {
        for (int j = 0; j < c; j++) {
            scanf("%d", &a[i][j]);
            sum += a[i][j];
        }
    }
    
    printf("Tong cac phan tu ma tran: %d\\n", sum);
    printf("Ma tran chuyen vi (%dx%d):\\n", c, r);
    for (int j = 0; j < c; j++) {
        for (int i = 0; i < r; i++) {
            printf("%d ", a[i][j]);
        }
        printf("\\n");
    }
    return 0;
}
`,
    defaultStdin: "2 3\n1 2 3\n4 5 6\n",
    testcases: [
      {
        id: 1,
        name: 'Test 1: Ma trận 2x3',
        input: "2 3\n1 2 3\n4 5 6\n",
        expected: "Tong cac phan tu ma tran: 21\nMa tran chuyen vi (3x2):\n1 4\n2 5\n3 6"
      },
      {
        id: 2,
        name: 'Test 2: Ma trận vuông 2x2',
        input: "2 2\n10 20\n30 40\n",
        expected: "Tong cac phan tu ma tran: 100\nMa tran chuyen vi (2x2):\n10 30\n20 40"
      }
    ]
  },
  {
    id: 'student_struct',
    name: '3. Quản lý Sinh viên (Struct & Sắp xếp Điểm TB)',
    description: 'Quản lý danh sách sinh viên, tính điểm trung bình và sắp xếp giảm dần',
    code: `/*
 * Dev-C++ Web Edition
 * Bài 3: Quản lý Sinh viên (Struct & Sắp xếp theo Điểm TB)
 */
#include <stdio.h>
#include <string.h>

struct SinhVien {
    char maSV[20];
    char hoTen[50];
    float toan;
    float tin;
    float dtb;
};

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;
    
    struct SinhVien ds[50];
    for (int i = 0; i < n; i++) {
        scanf("%s %s %f %f", ds[i].maSV, ds[i].hoTen, &ds[i].toan, &ds[i].tin);
        ds[i].dtb = (ds[i].toan + ds[i].tin) / 2.0f;
    }
    
    // Sap xep giam dan theo DTB
    for (int i = 0; i < n - 1; i++) {
        for (int j = i + 1; j < n; j++) {
            if (ds[i].dtb < ds[j].dtb) {
                struct SinhVien tmp = ds[i];
                ds[i] = ds[j];
                ds[j] = tmp;
            }
        }
    }
    
    printf("Danh sach sinh vien theo DTB giam dan:\\n");
    for (int i = 0; i < n; i++) {
        printf("%s - %s - DTB: %.2f\\n", ds[i].maSV, ds[i].hoTen, ds[i].dtb);
    }
    return 0;
}
`,
    defaultStdin: "3\nSV01 An 8.0 9.0\nSV02 Binh 6.5 7.5\nSV03 Cuong 9.0 9.5\n",
    testcases: [
      {
        id: 1,
        name: 'Test 1: 3 Sinh viên',
        input: "3\nSV01 An 8.0 9.0\nSV02 Binh 6.5 7.5\nSV03 Cuong 9.0 9.5\n",
        expected: "Danh sach sinh vien theo DTB giam dan:\nSV03 - Cuong - DTB: 9.25\nSV01 - An - DTB: 8.50\nSV02 - Binh - DTB: 7.00"
      }
    ]
  },
  {
    id: 'pointers_dyn',
    name: '4. Con trỏ & Cấp phát động (malloc / free)',
    description: 'Thao tác mảng động bằng con trỏ, hàm đảo ngược mảng tại chỗ',
    code: `/*
 * Dev-C++ Web Edition
 * Bài 4: Con trỏ & Cấp phát bộ nhớ động (malloc / free)
 */
#include <stdio.h>
#include <stdlib.h>

void DaoNguocMang(int *a, int n) {
    int *left = a;
    int *right = a + n - 1;
    while (left < right) {
        int temp = *left;
        *left = *right;
        *right = temp;
        left++;
        right--;
    }
}

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;
    
    int *arr = (int*)malloc(n * sizeof(int));
    if (!arr) return 1;
    
    for (int i = 0; i < n; i++) {
        scanf("%d", arr + i);
    }
    
    DaoNguocMang(arr, n);
    
    printf("Mang sau khi dao nguoc bang con tro:\\n");
    for (int i = 0; i < n; i++) {
        printf("%d ", *(arr + i));
    }
    printf("\\n");
    
    free(arr);
    return 0;
}
`,
    defaultStdin: "5\n10 20 30 40 50\n",
    testcases: [
      {
        id: 1,
        name: 'Test 1: Mảng 5 số',
        input: "5\n10 20 30 40 50\n",
        expected: "Mang sau khi dao nguoc bang con tro:\n50 40 30 20 10"
      },
      {
        id: 2,
        name: 'Test 2: Mảng 3 số âm',
        input: "3\n-1 -2 -3\n",
        expected: "Mang sau khi dao nguoc bang con tro:\n-3 -2 -1"
      }
    ]
  },
  {
    id: 'linked_list',
    name: '5. Danh sách liên kết đơn (Singly Linked List)',
    description: 'Cài đặt cấu trúc danh sách liên kết đơn, thêm node cuối và duyệt in danh sách',
    code: `/*
 * Dev-C++ Web Edition
 * Bài 5: Danh sách liên kết đơn (Singly Linked List CRUD)
 */
#include <stdio.h>
#include <stdlib.h>

struct Node {
    int data;
    struct Node* next;
};

struct Node* insertTail(struct Node* head, int val) {
    struct Node* newNode = (struct Node*)malloc(sizeof(struct Node));
    newNode->data = val;
    newNode->next = NULL;
    if (!head) return newNode;
    struct Node* cur = head;
    while (cur->next) cur = cur->next;
    cur->next = newNode;
    return head;
}

void printList(struct Node* head) {
    struct Node* cur = head;
    while (cur) {
        printf("%d -> ", cur->data);
        cur = cur->next;
    }
    printf("NULL\\n");
}

void freeList(struct Node* head) {
    while (head) {
        struct Node* tmp = head;
        head = head->next;
        free(tmp);
    }
}

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;
    
    struct Node* head = NULL;
    for (int i = 0; i < n; i++) {
        int x;
        scanf("%d", &x);
        head = insertTail(head, x);
    }
    
    printf("Danh sach lien ket:\\n");
    printList(head);
    freeList(head);
    return 0;
}
`,
    defaultStdin: "4\n5 15 25 35\n",
    testcases: [
      {
        id: 1,
        name: 'Test 1: 4 Node',
        input: "4\n5 15 25 35\n",
        expected: "Danh sach lien ket:\n5 -> 15 -> 25 -> 35 -> NULL"
      }
    ]
  },
  {
    id: 'quicksort_merge',
    name: '6. Sắp xếp QuickSort (Phân hoạch Lomuto)',
    description: 'Cài đặt thuật toán sắp xếp nhanh QuickSort chia để trị',
    code: `/*
 * Dev-C++ Web Edition
 * Bài 6: Sắp xếp nâng cao - QuickSort phân hoạch Lomuto
 */
#include <stdio.h>

void swap(int *a, int *b) {
    int t = *a;
    *a = *b;
    *b = t;
}

int partition(int a[], int low, int high) {
    int pivot = a[high];
    int i = low - 1;
    for (int j = low; j < high; j++) {
        if (a[j] <= pivot) {
            i++;
            swap(&a[i], &a[j]);
        }
    }
    swap(&a[i + 1], &a[high]);
    return i + 1;
}

void quickSort(int a[], int low, int high) {
    if (low < high) {
        int pi = partition(a, low, high);
        quickSort(a, low, pi - 1);
        quickSort(a, pi + 1, high);
    }
}

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;
    int a[100];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    
    quickSort(a, 0, n - 1);
    
    printf("Day sau khi QuickSort:\\n");
    for (int i = 0; i < n; i++) printf("%d ", a[i]);
    printf("\\n");
    return 0;
}
`,
    defaultStdin: "6\n64 34 25 12 22 11\n",
    testcases: [
      {
        id: 1,
        name: 'Test 1: Dãy 6 phần tử',
        input: "6\n64 34 25 12 22 11\n",
        expected: "Day sau khi QuickSort:\n11 12 22 25 34 64"
      },
      {
        id: 2,
        name: 'Test 2: Dãy đã sắp xếp ngược',
        input: "5\n5 4 3 2 1\n",
        expected: "Day sau khi QuickSort:\n1 2 3 4 5"
      }
    ]
  },
  {
    id: 'bst_tree',
    name: '7. Cây tìm kiếm nhị phân (Binary Search Tree)',
    description: 'Chèn node vào BST và duyệt theo thứ tự LNR (In-order tăng dần)',
    code: `/*
 * Dev-C++ Web Edition
 * Bài 7: Cây tìm kiếm nhị phân (Binary Search Tree - BST)
 */
#include <stdio.h>
#include <stdlib.h>

struct Node {
    int key;
    struct Node *left, *right;
};

struct Node* newNode(int item) {
    struct Node* temp = (struct Node*)malloc(sizeof(struct Node));
    temp->key = item;
    temp->left = temp->right = NULL;
    return temp;
}

struct Node* insert(struct Node* node, int key) {
    if (node == NULL) return newNode(key);
    if (key < node->key)
        node->left = insert(node->left, key);
    else if (key > node->key)
        node->right = insert(node->right, key);
    return node;
}

void inorder(struct Node* root) {
    if (root != NULL) {
        inorder(root->left);
        printf("%d ", root->key);
        inorder(root->right);
    }
}

void freeTree(struct Node* root) {
    if (root != NULL) {
        freeTree(root->left);
        freeTree(root->right);
        free(root);
    }
}

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;
    
    struct Node* root = NULL;
    for (int i = 0; i < n; i++) {
        int val;
        scanf("%d", &val);
        root = insert(root, val);
    }
    
    printf("Duyet LNR (In-order tang dan): ");
    inorder(root);
    printf("\\n");
    freeTree(root);
    return 0;
}
`,
    defaultStdin: "5\n50 30 70 20 40\n",
    testcases: [
      {
        id: 1,
        name: 'Test 1: 5 Node',
        input: "5\n50 30 70 20 40\n",
        expected: "Duyet LNR (In-order tang dan): 20 30 40 50 70"
      },
      {
        id: 2,
        name: 'Test 2: 7 Node cân bằng',
        input: "7\n40 20 60 10 30 50 70\n",
        expected: "Duyet LNR (In-order tang dan): 10 20 30 40 50 60 70"
      }
    ]
  },
  {
    id: 'knapsack_dp',
    name: '8. Quy hoạch động: Bài toán Cái Túi (0/1 Knapsack)',
    description: 'Tìm giá trị lớn nhất có thể mang trong balo với giới hạn trọng lượng W',
    code: `/*
 * Dev-C++ Web Edition
 * Bài 8: Quy hoạch động - Bài toán Cái Túi (0/1 Knapsack)
 */
#include <stdio.h>

int max(int a, int b) { return (a > b) ? a : b; }

int main() {
    int n, W;
    if (scanf("%d %d", &n, &W) != 2 || n <= 0 || W <= 0) return 0;
    
    int wt[50], val[50];
    for (int i = 0; i < n; i++) {
        scanf("%d %d", &wt[i], &val[i]);
    }
    
    int dp[51][101] = {0};
    for (int i = 1; i <= n; i++) {
        for (int w = 0; w <= W; w++) {
            if (wt[i - 1] <= w) {
                dp[i][w] = max(val[i - 1] + dp[i - 1][w - wt[i - 1]], dp[i - 1][w]);
            } else {
                dp[i][w] = dp[i - 1][w];
            }
        }
    }
    
    printf("Gia tri lon nhat trong ba lo: %d\\n", dp[n][W]);
    return 0;
}
`,
    defaultStdin: "3 50\n10 60\n20 100\n30 120\n",
    testcases: [
      {
        id: 1,
        name: 'Test 1: 3 đồ vật, W=50',
        input: "3 50\n10 60\n20 100\n30 120\n",
        expected: "Gia tri lon nhat trong ba lo: 220"
      }
    ]
  },
  {
    id: 'string_normalize',
    name: '9. Xử lý chuỗi: Chuẩn hóa họ tên & Palindrome',
    description: 'Xóa khoảng trắng thừa, viết hoa chữ cái đầu và kiểm tra chuỗi đối xứng',
    code: `/*
 * Dev-C++ Web Edition
 * Bài 9: Xử lý chuỗi - Chuẩn hóa họ tên & Kiểm tra Palindrome
 */
#include <stdio.h>
#include <string.h>
#include <ctype.h>

void normalizeName(char *s) {
    int n = strlen(s);
    int i = 0, j = 0;
    
    while (i < n && isspace(s[i])) i++;
    
    int newWord = 1;
    while (i < n) {
        if (!isspace(s[i])) {
            if (newWord) {
                s[j++] = toupper(s[i]);
                newWord = 0;
            } else {
                s[j++] = tolower(s[i]);
            }
        } else {
            if (!newWord) {
                s[j++] = ' ';
                newWord = 1;
            }
        }
        i++;
    }
    if (j > 0 && s[j - 1] == ' ') j--;
    s[j] = '\\0';
}

int isPalindrome(const char *s) {
    int l = 0, r = strlen(s) - 1;
    while (l < r) {
        if (s[l] != s[r]) return 0;
        l++;
        r--;
    }
    return 1;
}

int main() {
    char str[100];
    if (fgets(str, sizeof(str), stdin) != NULL) {
        str[strcspn(str, "\\r\\n")] = '\\0';
        normalizeName(str);
        printf("Chuoi sau khi chuan hoa: [%s]\\n", str);
    }
    
    char word[50];
    if (scanf("%s", word) == 1) {
        if (isPalindrome(word)) {
            printf("%s la chuoi doi xung (Palindrome)\\n", word);
        } else {
            printf("%s khong phai chuoi doi xung\\n", word);
        }
    }
    return 0;
}
`,
    defaultStdin: "   ngUYeN    vAn   a   \nracecar\n",
    testcases: [
      {
        id: 1,
        name: 'Test 1: Chuẩn hóa tên và Palindrome racecar',
        input: "   ngUYeN    vAn   a   \nracecar\n",
        expected: "Chuoi sau khi chuan hoa: [Nguyen Van A]\nracecar la chuoi doi xung (Palindrome)"
      }
    ]
  },
  {
    id: 'graph_bfs',
    name: '10. Đồ thị: Tìm đường đi ngắn nhất (BFS)',
    description: 'Duyệt theo chiều rộng (BFS) trên ma trận kề tìm khoảng cách ngắn nhất giữa 2 đỉnh',
    code: `/*
 * Dev-C++ Web Edition
 * Bài 10: Đồ thị - Tìm đường đi ngắn nhất (BFS)
 */
#include <stdio.h>

#define MAX 50

int adj[MAX][MAX];
int visited[MAX];
int queue[MAX];
int dist[MAX];

int main() {
    int V, E;
    if (scanf("%d %d", &V, &E) != 2 || V <= 0) return 0;
    
    for (int i = 0; i < E; i++) {
        int u, v;
        scanf("%d %d", &u, &v);
        adj[u][v] = 1;
        adj[v][u] = 1;
    }
    
    int startNode, endNode;
    scanf("%d %d", &startNode, &endNode);
    
    for (int i = 0; i < V; i++) dist[i] = -1;
    
    int front = 0, rear = 0;
    queue[rear++] = startNode;
    visited[startNode] = 1;
    dist[startNode] = 0;
    
    while (front < rear) {
        int u = queue[front++];
        for (int v = 0; v < V; v++) {
            if (adj[u][v] && !visited[v]) {
                visited[v] = 1;
                dist[v] = dist[u] + 1;
                queue[rear++] = v;
            }
        }
    }
    
    printf("Khoang cach ngan nhat tu %d den %d: %d\\n", startNode, endNode, dist[endNode]);
    return 0;
}
`,
    defaultStdin: "5 5\n0 1\n0 2\n1 3\n2 3\n3 4\n0 4\n",
    testcases: [
      {
        id: 1,
        name: 'Test 1: Đồ thị 5 đỉnh, tìm từ 0 đến 4',
        input: "5 5\n0 1\n0 2\n1 3\n2 3\n3 4\n0 4\n",
        expected: "Khoang cach ngan nhat tu 0 den 4: 3"
      }
    ]
  },
  {
    id: 'hello',
    name: '11. Hello World (Cơ bản)',
    description: 'Chương trình C++ đầu tiên xuất chuỗi ra màn hình console',
    code: `/*
 * Dev-C++ Web Edition
 * Bài 1: Hello World
 */
#include <iostream>

using namespace std;

int main() {
    cout << "========================================" << endl;
    cout << " Chao mung den voi Dev-C++ Web Edition! " << endl;
    cout << " Bien dich va chay 100% tren trinh duyet! " << endl;
    cout << "========================================" << endl;
    
    return 0;
}
`,
    testcases: [
      {
        id: 1,
        name: 'Test 1: Mac dinh',
        input: '',
        expected: `========================================\n Chao mung den voi Dev-C++ Web Edition! \n Bien dich va chay 100% tren trinh duyet! \n========================================`
      }
    ]
  },
  {
    id: 'sum_ab',
    name: '12. Tính tổng A + B (cin / cout)',
    description: 'Nhập 2 số nguyên từ bàn phím và in ra tổng',
    code: `/*
 * Dev-C++ Web Edition
 * Bài 12: Nhập xuất dữ liệu cin / cout
 */
#include <iostream>

using namespace std;

int main() {
    long long a, b;
    if (cin >> a >> b) {
        cout << "Tong: " << (a + b) << endl;
    } else {
        cout << "Vui long nhap 2 so a va b!" << endl;
    }
    return 0;
}
`,
    defaultStdin: "45 55\n",
    testcases: [
      {
        id: 1,
        name: 'Test 1: Hai số dương',
        input: '45 55\n',
        expected: 'Tong: 100'
      },
      {
        id: 2,
        name: 'Test 2: Số âm và dương',
        input: '-20 50\n',
        expected: 'Tong: 30'
      },
      {
        id: 3,
        name: 'Test 3: Số lớn',
        input: '1000000000 2000000000\n',
        expected: 'Tong: 3000000000'
      }
    ]
  },
  {
    id: 'vector_sort',
    name: '13. C++ STL Vector & Sắp xếp (Algorithm)',
    description: 'Sử dụng std::vector, std::sort và vòng lặp range-based C++11/17',
    code: `/*
 * Dev-C++ Web Edition
 * Bài 13: Thư viện chuẩn STL Vector & Algorithm Sort
 */
#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

int main() {
    int n;
    if (!(cin >> n)) return 0;
    
    vector<int> a(n);
    for (int i = 0; i < n; ++i) {
        cin >> a[i];
    }
    
    // Sắp xếp tăng dần
    sort(a.begin(), a.end());
    
    cout << "Mang sau khi sap xep: ";
    for (int x : a) {
        cout << x << " ";
    }
    cout << endl;
    
    return 0;
}
`,
    defaultStdin: "5\n42 12 88 3 19\n",
    testcases: [
      {
        id: 1,
        name: 'Test 1: Dãy 5 phần tử',
        input: '5\n42 12 88 3 19\n',
        expected: 'Mang sau khi sap xep: 3 12 19 42 88'
      },
      {
        id: 2,
        name: 'Test 2: Dãy đã sắp xếp',
        input: '4\n1 2 3 4\n',
        expected: 'Mang sau khi sap xep: 1 2 3 4'
      },
      {
        id: 3,
        name: 'Test 3: Dãy số âm',
        input: '3\n-5 -10 0\n',
        expected: 'Mang sau khi sap xep: -10 -5 0'
      }
    ]
  },
  {
    id: 'prime_check',
    name: '14. Kiểm tra số nguyên tố (O(sqrt(N)))',
    description: 'Thuật toán kiểm tra số nguyên tố tối ưu O(sqrt(N))',
    code: `/*
 * Dev-C++ Web Edition
 * Bài 14: Kiểm tra số nguyên tố
 */
#include <iostream>
#include <cmath>

using namespace std;

bool isPrime(long long n) {
    if (n < 2) return false;
    if (n == 2 || n == 3) return true;
    if (n % 2 == 0 || n % 3 == 0) return false;
    for (long long i = 5; i * i <= n; i += 6) {
        if (n % i == 0 || n % (i + 2) == 0) return false;
    }
    return true;
}

int main() {
    long long n;
    while (cin >> n) {
        if (isPrime(n)) {
            cout << n << " la so nguyen to" << endl;
        } else {
            cout << n << " khong phai so nguyen to" << endl;
        }
    }
    return 0;
}
`,
    defaultStdin: "7\n10\n1000000007\n",
    testcases: [
      {
        id: 1,
        name: 'Test 1: Số 7 và 10',
        input: '7\n10\n',
        expected: '7 la so nguyen to\n10 khong phai so nguyen to'
      },
      {
        id: 2,
        name: 'Test 2: Số nguyên tố lớn 10^9+7',
        input: '1000000007\n',
        expected: '1000000007 la so nguyen to'
      },
      {
        id: 3,
        name: 'Test 3: Số đặc biệt 0 và 1',
        input: '0\n1\n',
        expected: '0 khong phai so nguyen to\n1 khong phai so nguyen to'
      }
    ]
  },
  {
    id: 'map_frequency',
    name: '15. Đếm tần số từ (std::map)',
    description: 'Đếm tần số xuất hiện của các chuỗi bằng bảng ánh xạ STL Map',
    code: `/*
 * Dev-C++ Web Edition
 * Bài 5: STL Map - Đếm tần số xuất hiện
 */
#include <iostream>
#include <string>
#include <map>

using namespace std;

int main() {
    int n;
    if (!(cin >> n)) return 0;
    
    map<string, int> freq;
    for (int i = 0; i < n; ++i) {
        string word;
        cin >> word;
        freq[word]++;
    }
    
    cout << "Tan so cac tu:" << endl;
    for (const auto& pair : freq) {
        cout << pair.first << ": " << pair.second << endl;
    }
    
    return 0;
}
`,
    defaultStdin: "6\napple banana apple orange apple banana\n",
    testcases: [
      {
        id: 1,
        name: 'Test 1: 6 từ hoa quả',
        input: '6\napple banana apple orange apple banana\n',
        expected: "Tan so cac tu:\napple: 3\nbanana: 2\norange: 1"
      }
    ]
  }
];
