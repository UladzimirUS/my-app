// GenericList.h — обобщённый (шаблонный) двусвязный список.
// Используется для хранения рейсов, клиентов, заявок и авиакомпаний.
#pragma once

#include <cstddef>
#include <istream>
#include <ostream>
#include <stdexcept>
#include <string>
#include <utility>

template <typename T>
class GenericList {
    struct Node {
        T value;
        Node* prev;
        Node* next;
        explicit Node(const T& v) : value(v), prev(nullptr), next(nullptr) {}
    };

    Node* head_ = nullptr;
    Node* tail_ = nullptr;
    std::size_t size_ = 0;

public:
    // ---------- итераторы (для range-based for) ----------
    class Iterator {
        Node* n_;
    public:
        explicit Iterator(Node* n) : n_(n) {}
        T& operator*() const { return n_->value; }
        T* operator->() const { return &n_->value; }
        Iterator& operator++() { n_ = n_->next; return *this; }
        bool operator!=(const Iterator& o) const { return n_ != o.n_; }
        bool operator==(const Iterator& o) const { return n_ == o.n_; }
    };
    class ConstIterator {
        const Node* n_;
    public:
        explicit ConstIterator(const Node* n) : n_(n) {}
        const T& operator*() const { return n_->value; }
        const T* operator->() const { return &n_->value; }
        ConstIterator& operator++() { n_ = n_->next; return *this; }
        bool operator!=(const ConstIterator& o) const { return n_ != o.n_; }
        bool operator==(const ConstIterator& o) const { return n_ == o.n_; }
    };

    Iterator begin() { return Iterator(head_); }
    Iterator end() { return Iterator(nullptr); }
    ConstIterator begin() const { return ConstIterator(head_); }
    ConstIterator end() const { return ConstIterator(nullptr); }

    // ---------- конструкторы / деструктор ----------
    GenericList() = default;
    GenericList(const GenericList& other) { for (const T& v : other) add(v); }
    GenericList(GenericList&& other) noexcept { swap(other); }
    GenericList& operator=(GenericList other) { swap(other); return *this; }
    ~GenericList() { clear(); }

    void swap(GenericList& other) noexcept {
        std::swap(head_, other.head_);
        std::swap(tail_, other.tail_);
        std::swap(size_, other.size_);
    }

    // ---------- основные операции ----------
    std::size_t size() const { return size_; }
    bool empty() const { return size_ == 0; }

    void add(const T& value) {
        Node* n = new Node(value);
        n->prev = tail_;
        if (tail_) tail_->next = n; else head_ = n;
        tail_ = n;
        ++size_;
    }

    void clear() {
        Node* cur = head_;
        while (cur) { Node* next = cur->next; delete cur; cur = next; }
        head_ = tail_ = nullptr;
        size_ = 0;
    }

    T& at(std::size_t index) {
        if (index >= size_) throw std::out_of_range("GenericList: индекс вне диапазона");
        Node* cur = head_;
        while (index--) cur = cur->next;
        return cur->value;
    }
    const T& at(std::size_t index) const { return const_cast<GenericList*>(this)->at(index); }

    // Первый элемент, удовлетворяющий предикату, или nullptr.
    template <typename Pred>
    T* findIf(Pred pred) {
        for (Node* c = head_; c; c = c->next) if (pred(c->value)) return &c->value;
        return nullptr;
    }
    template <typename Pred>
    const T* findIf(Pred pred) const { return const_cast<GenericList*>(this)->findIf(pred); }

    // Новый список из элементов, удовлетворяющих предикату.
    template <typename Pred>
    GenericList filter(Pred pred) const {
        GenericList res;
        for (const T& v : *this) if (pred(v)) res.add(v);
        return res;
    }

    // Количество элементов, удовлетворяющих предикату.
    template <typename Pred>
    std::size_t countIf(Pred pred) const {
        std::size_t n = 0;
        for (const T& v : *this) if (pred(v)) ++n;
        return n;
    }

    // Удаляет все элементы, удовлетворяющие предикату; возвращает их число.
    template <typename Pred>
    std::size_t removeIf(Pred pred) {
        std::size_t removed = 0;
        Node* cur = head_;
        while (cur) {
            Node* next = cur->next;
            if (pred(cur->value)) {
                if (cur->prev) cur->prev->next = cur->next; else head_ = cur->next;
                if (cur->next) cur->next->prev = cur->prev; else tail_ = cur->prev;
                delete cur;
                --size_;
                ++removed;
            }
            cur = next;
        }
        return removed;
    }
};

// ---------- перегрузка операторов ввода/вывода для списка ----------
// Формат: первая строка — количество элементов, далее по одной строке на элемент.
template <typename T>
std::ostream& operator<<(std::ostream& os, const GenericList<T>& list) {
    os << list.size() << '\n';
    for (const T& v : list) os << v << '\n';
    return os;
}

template <typename T>
std::istream& operator>>(std::istream& is, GenericList<T>& list) {
    list.clear();
    std::string line;
    if (!std::getline(is, line)) return is;
    std::size_t count = 0;
    try {
        count = static_cast<std::size_t>(std::stoul(line));
    } catch (...) {
        is.setstate(std::ios::failbit);
        return is;
    }
    for (std::size_t i = 0; i < count; ++i) {
        T item;
        if (!(is >> item)) return is;
        list.add(item);
    }
    return is;
}
