#include "Database.h"

#include <algorithm>
#include <cctype>
#include <cstdio>
#include <cmath>
#include <fstream>
#include <sstream>

namespace {

const char* kHeader = "AVIA_DB 1";

std::string trim(const std::string& s) {
    std::size_t b = s.find_first_not_of(" \t\r\n");
    if (b == std::string::npos) return "";
    std::size_t e = s.find_last_not_of(" \t\r\n");
    return s.substr(b, e - b + 1);
}

// Приведение к нижнему регистру для ASCII и кириллицы в UTF-8.
std::string lower(const std::string& in) {
    std::string s = trim(in);
    std::string r;
    for (std::size_t i = 0; i < s.size(); ++i) {
        unsigned char c = static_cast<unsigned char>(s[i]);
        if (c < 0x80) {
            r += static_cast<char>(std::tolower(c));
        } else if (c == 0xD0 && i + 1 < s.size()) {
            unsigned char n = static_cast<unsigned char>(s[++i]);
            if (n >= 0x90 && n <= 0x9F) { r += '\xD0'; r += static_cast<char>(n + 0x20); }      // А-П
            else if (n >= 0xA0 && n <= 0xAF) { r += '\xD1'; r += static_cast<char>(n - 0x20); } // Р-Я
            else if (n == 0x81) { r += '\xD1'; r += '\x91'; }                                   // Ё
            else { r += '\xD0'; r += static_cast<char>(n); }
        } else {
            r += static_cast<char>(c);
        }
    }
    return r;
}

void expectLine(std::istream& is, const std::string& expected) {
    std::string line;
    if (!std::getline(is, line) || trim(line) != expected)
        throw AppError("Повреждённый файл: ожидалось \"" + expected + "\"");
}

double round2(double v) { return std::round(v * 100.0) / 100.0; }

}  // namespace

// ---------------- поиск по id ----------------
const Airline& Database::airline(int id) const {
    const Airline* a = airlines.findIf([id](const Airline& x) { return x.id == id; });
    if (!a) throw AppError("Авиакомпания #" + std::to_string(id) + " не найдена");
    return *a;
}

const Flight& Database::flight(int id) const { return const_cast<Database*>(this)->flightRef(id); }
const Client& Database::client(int id) const { return const_cast<Database*>(this)->clientRef(id); }
const Order& Database::order(int id) const { return const_cast<Database*>(this)->orderRef(id); }

Flight& Database::flightRef(int id) {
    Flight* f = flights.findIf([id](const Flight& x) { return x.id == id; });
    if (!f) throw AppError("Рейс #" + std::to_string(id) + " не найден");
    return *f;
}

Client& Database::clientRef(int id) {
    Client* c = clients.findIf([id](const Client& x) { return x.id == id; });
    if (!c) throw AppError("Клиент #" + std::to_string(id) + " не найден");
    return *c;
}

Order& Database::orderRef(int id) {
    Order* o = orders.findIf([id](const Order& x) { return x.id == id; });
    if (!o) throw AppError("Заявка #" + std::to_string(id) + " не найдена");
    return *o;
}

int Database::occupiedSeats(int flightId) const {
    return static_cast<int>(orders.countIf(
        [flightId](const Order& o) { return o.flightId == flightId && o.status != OrderStatus::Cancelled; }));
}

int Database::freeSeats(int flightId) const { return flight(flightId).seatsTotal - occupiedSeats(flightId); }

// ---------------- запросы ----------------
GenericList<Order> Database::ordersByClient(int clientId) const {
    client(clientId);  // проверка существования
    return orders.filter([clientId](const Order& o) { return o.clientId == clientId; });
}

GenericList<Flight> Database::searchFlights(const std::string& destination, const std::string& date) const {
    std::string dest = lower(destination);
    std::string d = trim(date);
    if (dest.empty()) throw AppError("Укажите пункт назначения");
    if (!isValidDate(d)) throw AppError("Дата должна быть в формате ГГГГ-ММ-ДД");
    return flights.filter([&](const Flight& f) { return lower(f.to) == dest && f.date == d; });
}

int Database::paidTicketsCount(int flightId) const {
    flight(flightId);
    return static_cast<int>(orders.countIf(
        [flightId](const Order& o) { return o.flightId == flightId && o.status == OrderStatus::Paid; }));
}

GenericList<Flight> Database::flightsByAirline(int airlineId) const {
    airline(airlineId);
    return flights.filter([airlineId](const Flight& f) { return f.airlineId == airlineId; });
}

double Database::revenueByFlight(int flightId) const {
    flight(flightId);
    double sum = 0;
    for (const Order& o : orders)
        if (o.flightId == flightId && o.status == OrderStatus::Paid) sum += o.price;
    return round2(sum);
}

double Database::revenueByAirline(int airlineId) const {
    double sum = 0;
    for (const Flight& f : flightsByAirline(airlineId)) sum += revenueByFlight(f.id);
    return round2(sum);
}

GenericList<Passenger> Database::passengersOnFlight(int flightId) const {
    flight(flightId);
    GenericList<Passenger> res;
    for (const Order& o : orders) {
        if (o.flightId != flightId) continue;
        if (o.status != OrderStatus::Booked && o.status != OrderStatus::Paid) continue;
        res.add(Passenger{client(o.clientId), o});
    }
    return res;
}

// ---------------- операции ----------------
int Database::createOrder(int clientId, int flightId, ServiceClass cls) {
    client(clientId);
    const Flight& f = flight(flightId);
    if (freeSeats(flightId) <= 0) throw AppError("На рейсе " + f.number + " нет свободных мест");
    Order o;
    o.id = nextOrderId_++;
    o.clientId = clientId;
    o.flightId = flightId;
    o.serviceClass = cls;
    o.status = OrderStatus::New;
    o.price = round2(f.basePrice * classMultiplier(cls));
    o.created = today();
    orders.add(o);
    return o.id;
}

bool Database::canTransition(OrderStatus from, OrderStatus to) {
    switch (from) {
        case OrderStatus::New:
            return to == OrderStatus::Booked || to == OrderStatus::Paid || to == OrderStatus::Cancelled;
        case OrderStatus::Booked:
            return to == OrderStatus::Paid || to == OrderStatus::Cancelled;
        case OrderStatus::Paid:
            return to == OrderStatus::Cancelled;  // возврат билета
        case OrderStatus::Cancelled:
            return false;
    }
    return false;
}

void Database::changeOrderStatus(int orderId, OrderStatus newStatus) {
    Order& o = orderRef(orderId);
    if (!canTransition(o.status, newStatus))
        throw AppError("Нельзя перевести заявку из статуса «" + toString(o.status) + "» в «" + toString(newStatus) +
                       "»");
    o.status = newStatus;
}

void Database::validateFlight(const Flight& f) const {
    if (trim(f.number).empty()) throw AppError("Укажите номер рейса");
    airline(f.airlineId);
    if (trim(f.from).empty() || trim(f.to).empty()) throw AppError("Укажите пункты вылета и назначения");
    if (lower(f.from) == lower(f.to)) throw AppError("Пункты вылета и назначения совпадают");
    if (!isValidDate(f.date)) throw AppError("Дата вылета должна быть в формате ГГГГ-ММ-ДД");
    if (!isValidTime(f.time)) throw AppError("Время вылета должно быть в формате ЧЧ:ММ");
    if (f.seatsTotal <= 0) throw AppError("Количество мест должно быть больше нуля");
    if (f.basePrice <= 0) throw AppError("Цена билета должна быть больше нуля");
}

int Database::addFlight(Flight f) {
    f.number = trim(f.number);
    f.from = trim(f.from);
    f.to = trim(f.to);
    validateFlight(f);
    bool dup = flights.findIf([&](const Flight& x) { return x.number == f.number && x.date == f.date; }) != nullptr;
    if (dup) throw AppError("Рейс " + f.number + " на " + f.date + " уже есть в расписании");
    f.id = nextFlightId_++;
    flights.add(f);
    return f.id;
}

void Database::removeFlight(int flightId) {
    const Flight& f = flight(flightId);
    int active = occupiedSeats(flightId);
    if (active > 0)
        throw AppError("На рейс " + f.number + " есть действующие заявки (" + std::to_string(active) +
                       "). Сначала отмените их.");
    orders.removeIf([flightId](const Order& o) { return o.flightId == flightId; });  // только отменённые
    flights.removeIf([flightId](const Flight& x) { return x.id == flightId; });
}

void Database::validateClient(const Client& c) const {
    if (trim(c.fullName).empty()) throw AppError("Укажите ФИО клиента");
    if (trim(c.passport).empty()) throw AppError("Укажите номер паспорта");
    bool dup = clients.findIf([&](const Client& x) { return x.id != c.id && trim(x.passport) == trim(c.passport); });
    if (dup) throw AppError("Клиент с паспортом " + c.passport + " уже существует");
    if (!c.email.empty() && c.email.find('@') == std::string::npos) throw AppError("Некорректный e-mail");
}

void Database::editClient(const Client& c) {
    Client& target = clientRef(c.id);
    Client copy = c;
    copy.fullName = trim(copy.fullName);
    copy.passport = trim(copy.passport);
    copy.phone = trim(copy.phone);
    copy.email = trim(copy.email);
    validateClient(copy);
    target = copy;
}

int Database::addClient(Client c) {
    c.id = 0;
    c.fullName = trim(c.fullName);
    c.passport = trim(c.passport);
    c.phone = trim(c.phone);
    c.email = trim(c.email);
    validateClient(c);
    c.id = nextClientId_++;
    clients.add(c);
    return c.id;
}

void Database::removeClient(int clientId) {
    client(clientId);
    if (orders.countIf([clientId](const Order& o) { return o.clientId == clientId; }) > 0)
        throw AppError("У клиента есть заявки — удаление невозможно");
    clients.removeIf([clientId](const Client& c) { return c.id == clientId; });
}

int Database::addAirline(Airline a) {
    a.code = trim(a.code);
    a.name = trim(a.name);
    a.country = trim(a.country);
    if (a.name.empty()) throw AppError("Укажите название авиакомпании");
    if (a.code.empty()) throw AppError("Укажите код авиакомпании");
    if (airlines.findIf([&](const Airline& x) { return lower(x.code) == lower(a.code); }))
        throw AppError("Авиакомпания с кодом " + a.code + " уже существует");
    a.id = nextAirlineId_++;
    airlines.add(a);
    return a.id;
}

void Database::removeAirline(int airlineId) {
    airline(airlineId);
    if (flights.countIf([airlineId](const Flight& f) { return f.airlineId == airlineId; }) > 0)
        throw AppError("У авиакомпании есть рейсы — удаление невозможно");
    airlines.removeIf([airlineId](const Airline& a) { return a.id == airlineId; });
}

// ---------------- файлы ----------------
std::ostream& operator<<(std::ostream& os, const Database& db) {
    os << kHeader << '\n';
    os << "[AIRLINES]\n" << db.airlines;
    os << "[FLIGHTS]\n" << db.flights;
    os << "[CLIENTS]\n" << db.clients;
    os << "[ORDERS]\n" << db.orders;
    os << "[END]\n";
    return os;
}

std::istream& operator>>(std::istream& is, Database& db) {
    Database tmp;
    expectLine(is, kHeader);
    expectLine(is, "[AIRLINES]");
    if (!(is >> tmp.airlines)) throw AppError("Ошибка чтения авиакомпаний");
    expectLine(is, "[FLIGHTS]");
    if (!(is >> tmp.flights)) throw AppError("Ошибка чтения рейсов");
    expectLine(is, "[CLIENTS]");
    if (!(is >> tmp.clients)) throw AppError("Ошибка чтения клиентов");
    expectLine(is, "[ORDERS]");
    if (!(is >> tmp.orders)) throw AppError("Ошибка чтения заявок");
    expectLine(is, "[END]");
    tmp.validateLinks();
    tmp.recalcIds();
    db = tmp;
    return is;
}

void Database::validateLinks() const {
    for (const Flight& f : flights) airline(f.airlineId);
    for (const Order& o : orders) {
        client(o.clientId);
        flight(o.flightId);
    }
}

void Database::recalcIds() {
    auto maxId = [](const auto& list) {
        int m = 0;
        for (const auto& x : list) m = std::max(m, x.id);
        return m + 1;
    };
    nextAirlineId_ = maxId(airlines);
    nextFlightId_ = maxId(flights);
    nextClientId_ = maxId(clients);
    nextOrderId_ = maxId(orders);
}

void Database::saveToFile(const std::string& path) const {
    std::string tmpPath = path + ".tmp";
    {
        std::ofstream out(tmpPath, std::ios::trunc);
        if (!out) throw AppError("Не удалось открыть файл для записи: " + path);
        out << *this;
        if (!out) throw AppError("Ошибка записи в файл: " + path);
    }
    std::remove(path.c_str());
    if (std::rename(tmpPath.c_str(), path.c_str()) != 0) throw AppError("Не удалось сохранить файл: " + path);
}

void Database::loadFromFile(const std::string& path) {
    std::ifstream in(path);
    if (!in) throw AppError("Файл не найден: " + path);
    in >> *this;
}

void Database::clear() { *this = Database(); }

// ---------------- демонстрационные данные ----------------
void Database::seedDemo() {
    clear();
    int lo = addAirline({0, "LO", "LOT Polish Airlines", "Польша"});
    int fr = addAirline({0, "FR", "Ryanair", "Ирландия"});
    int b2 = addAirline({0, "B2", "Belavia", "Беларусь"});

    auto fl = [&](const char* n, int a, const char* from, const char* to, const char* d, const char* t,
                  FlightType ty, int seats, double price) {
        Flight f;
        f.number = n; f.airlineId = a; f.from = from; f.to = to; f.date = d; f.time = t;
        f.type = ty; f.seatsTotal = seats; f.basePrice = price;
        return addFlight(f);
    };
    int f1 = fl("LO3901", lo, "Варшава", "Гданьск", "2026-12-01", "08:15", FlightType::Domestic, 120, 290);
    int f2 = fl("LO281", lo, "Варшава", "Лондон", "2026-12-01", "10:40", FlightType::International, 180, 650);
    int f3 = fl("FR1902", fr, "Краков", "Лондон", "2026-12-05", "06:30", FlightType::International, 189, 320);
    int f4 = fl("FR3021", fr, "Варшава", "Рим", "2026-12-10", "13:05", FlightType::International, 189, 410);
    int f5 = fl("B2867", b2, "Минск", "Стамбул", "2026-12-03", "15:20", FlightType::International, 150, 780);
    fl("LO3923", lo, "Варшава", "Краков", "2026-12-02", "19:50", FlightType::Domestic, 3, 250);

    int c1 = addClient({0, "Иванов Иван Иванович", "AB1234567", "+48 600 100 200", "ivanov@example.com"});
    int c2 = addClient({0, "Kowalska Anna", "EA7654321", "+48 501 222 333", "anna.k@example.com"});
    int c3 = addClient({0, "Петров Пётр Сергеевич", "MP2233445", "+375 29 111 22 33", "petrov@example.com"});
    int c4 = addClient({0, "Nowak Piotr", "ED9988776", "+48 790 555 444", ""});

    auto ord = [&](int c, int f, ServiceClass cls, OrderStatus st) {
        int id = createOrder(c, f, cls);
        if (st == OrderStatus::Booked || st == OrderStatus::Paid) changeOrderStatus(id, OrderStatus::Booked);
        if (st == OrderStatus::Paid) changeOrderStatus(id, OrderStatus::Paid);
        if (st == OrderStatus::Cancelled) changeOrderStatus(id, OrderStatus::Cancelled);
    };
    ord(c1, f2, ServiceClass::Business, OrderStatus::Paid);
    ord(c1, f1, ServiceClass::Economy, OrderStatus::Booked);
    ord(c2, f2, ServiceClass::Economy, OrderStatus::Paid);
    ord(c2, f4, ServiceClass::First, OrderStatus::New);
    ord(c3, f5, ServiceClass::Economy, OrderStatus::Paid);
    ord(c3, f2, ServiceClass::Economy, OrderStatus::Cancelled);
    ord(c4, f3, ServiceClass::Economy, OrderStatus::Paid);
    ord(c4, f2, ServiceClass::First, OrderStatus::Booked);
}
