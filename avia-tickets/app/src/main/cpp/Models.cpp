#include "Models.h"

#include <cctype>
#include <cstdio>
#include <ctime>
#include <sstream>
#include <stdexcept>

std::string toString(FlightType t) {
    return t == FlightType::Domestic ? "внутренний" : "международный";
}

std::string toString(ServiceClass c) {
    switch (c) {
        case ServiceClass::Economy: return "эконом";
        case ServiceClass::Business: return "бизнес";
        case ServiceClass::First: return "первый";
    }
    return "?";
}

std::string toString(OrderStatus s) {
    switch (s) {
        case OrderStatus::New: return "новая";
        case OrderStatus::Booked: return "забронирована";
        case OrderStatus::Paid: return "оплачена";
        case OrderStatus::Cancelled: return "отменена";
    }
    return "?";
}

FlightType flightTypeFromInt(int v) {
    if (v < 0 || v > 1) throw std::invalid_argument("Неверный тип рейса");
    return static_cast<FlightType>(v);
}

ServiceClass serviceClassFromInt(int v) {
    if (v < 0 || v > 2) throw std::invalid_argument("Неверный класс обслуживания");
    return static_cast<ServiceClass>(v);
}

OrderStatus orderStatusFromInt(int v) {
    if (v < 0 || v > 3) throw std::invalid_argument("Неверный статус заявки");
    return static_cast<OrderStatus>(v);
}

double classMultiplier(ServiceClass c) {
    switch (c) {
        case ServiceClass::Economy: return 1.0;
        case ServiceClass::Business: return 2.5;
        case ServiceClass::First: return 4.0;
    }
    return 1.0;
}

static bool digits(const std::string& s, std::size_t from, std::size_t n) {
    for (std::size_t i = from; i < from + n; ++i)
        if (!std::isdigit(static_cast<unsigned char>(s[i]))) return false;
    return true;
}

bool isValidDate(const std::string& d) {
    if (d.size() != 10 || d[4] != '-' || d[7] != '-') return false;
    if (!digits(d, 0, 4) || !digits(d, 5, 2) || !digits(d, 8, 2)) return false;
    int y = std::stoi(d.substr(0, 4)), m = std::stoi(d.substr(5, 2)), day = std::stoi(d.substr(8, 2));
    if (m < 1 || m > 12 || day < 1) return false;
    static const int dim[] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
    int max = dim[m - 1];
    if (m == 2 && ((y % 4 == 0 && y % 100 != 0) || y % 400 == 0)) max = 29;
    return day <= max;
}

bool isValidTime(const std::string& t) {
    if (t.size() != 5 || t[2] != ':' || !digits(t, 0, 2) || !digits(t, 3, 2)) return false;
    return std::stoi(t.substr(0, 2)) < 24 && std::stoi(t.substr(3, 2)) < 60;
}

std::string today() {
    std::time_t now = std::time(nullptr);
    std::tm tmv{};
#if defined(_WIN32)
    localtime_s(&tmv, &now);
#else
    localtime_r(&now, &tmv);
#endif
    char buf[32];
    std::snprintf(buf, sizeof buf, "%04d-%02d-%02d", tmv.tm_year + 1900, tmv.tm_mon + 1, tmv.tm_mday);
    return buf;
}

// ---------------- сериализация ----------------
namespace ser {

std::string escape(const std::string& s) {
    std::string r;
    for (char c : s) {
        if (c == '\\') r += "\\\\";
        else if (c == ';') r += "\\s";
        else if (c == '\n') r += "\\n";
        else if (c == '\r') continue;
        else r += c;
    }
    return r;
}

std::vector<std::string> split(const std::string& line) {
    std::vector<std::string> parts(1);
    for (std::size_t i = 0; i < line.size(); ++i) {
        char c = line[i];
        if (c == '\\' && i + 1 < line.size()) {
            char n = line[++i];
            parts.back() += (n == 's' ? ';' : n == 'n' ? '\n' : n);
        } else if (c == ';') {
            parts.emplace_back();
        } else if (c != '\r') {
            parts.back() += c;
        }
    }
    return parts;
}

}  // namespace ser

// Читает строку и разбивает её на ожидаемое число полей.
static bool readFields(std::istream& is, std::size_t expected, std::vector<std::string>& out) {
    std::string line;
    if (!std::getline(is, line)) return false;
    out = ser::split(line);
    if (out.size() != expected) {
        is.setstate(std::ios::failbit);
        return false;
    }
    return true;
}

// Число из строки; при ошибке переводит поток в состояние fail.
template <typename F>
static bool parseAll(std::istream& is, F f) {
    try {
        f();
        return true;
    } catch (...) {
        is.setstate(std::ios::failbit);
        return false;
    }
}

std::ostream& operator<<(std::ostream& os, const Airline& a) {
    using ser::escape;
    return os << a.id << ';' << escape(a.code) << ';' << escape(a.name) << ';' << escape(a.country);
}

std::istream& operator>>(std::istream& is, Airline& a) {
    std::vector<std::string> f;
    if (!readFields(is, 4, f)) return is;
    parseAll(is, [&] {
        a.id = std::stoi(f[0]);
        a.code = f[1];
        a.name = f[2];
        a.country = f[3];
    });
    return is;
}

std::ostream& operator<<(std::ostream& os, const Flight& x) {
    using ser::escape;
    std::ostringstream price;
    price << x.basePrice;
    return os << x.id << ';' << escape(x.number) << ';' << x.airlineId << ';' << escape(x.from) << ';'
              << escape(x.to) << ';' << x.date << ';' << x.time << ';' << static_cast<int>(x.type) << ';'
              << x.seatsTotal << ';' << price.str();
}

std::istream& operator>>(std::istream& is, Flight& x) {
    std::vector<std::string> f;
    if (!readFields(is, 10, f)) return is;
    parseAll(is, [&] {
        x.id = std::stoi(f[0]);
        x.number = f[1];
        x.airlineId = std::stoi(f[2]);
        x.from = f[3];
        x.to = f[4];
        x.date = f[5];
        x.time = f[6];
        x.type = flightTypeFromInt(std::stoi(f[7]));
        x.seatsTotal = std::stoi(f[8]);
        x.basePrice = std::stod(f[9]);
    });
    return is;
}

std::ostream& operator<<(std::ostream& os, const Client& c) {
    using ser::escape;
    return os << c.id << ';' << escape(c.fullName) << ';' << escape(c.passport) << ';' << escape(c.phone)
              << ';' << escape(c.email);
}

std::istream& operator>>(std::istream& is, Client& c) {
    std::vector<std::string> f;
    if (!readFields(is, 5, f)) return is;
    parseAll(is, [&] {
        c.id = std::stoi(f[0]);
        c.fullName = f[1];
        c.passport = f[2];
        c.phone = f[3];
        c.email = f[4];
    });
    return is;
}

std::ostream& operator<<(std::ostream& os, const Order& o) {
    std::ostringstream price;
    price << o.price;
    return os << o.id << ';' << o.clientId << ';' << o.flightId << ';' << static_cast<int>(o.serviceClass) << ';'
              << static_cast<int>(o.status) << ';' << price.str() << ';' << o.created;
}

std::istream& operator>>(std::istream& is, Order& o) {
    std::vector<std::string> f;
    if (!readFields(is, 7, f)) return is;
    parseAll(is, [&] {
        o.id = std::stoi(f[0]);
        o.clientId = std::stoi(f[1]);
        o.flightId = std::stoi(f[2]);
        o.serviceClass = serviceClassFromInt(std::stoi(f[3]));
        o.status = orderStatusFromInt(std::stoi(f[4]));
        o.price = std::stod(f[5]);
        o.created = f[6];
    });
    return is;
}
