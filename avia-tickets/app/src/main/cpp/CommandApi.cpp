#include "CommandApi.h"

#include <fstream>
#include <functional>
#include <map>
#include <sstream>

namespace {

std::string clean(const std::string& s) {
    std::string r;
    for (char c : s) r += (c == '\t' || c == '\n' || c == '\r') ? ' ' : c;
    return r;
}

std::string num(double v) {
    std::ostringstream os;
    os.setf(std::ios::fixed);
    os.precision(2);
    os << v;
    return os.str();
}

class Rows {
    std::ostringstream os_;
    bool first_ = true;
public:
    Rows& row() {
        if (!first_) os_ << '\n';
        first_ = false;
        newRow_ = true;
        return *this;
    }
    template <typename T>
    Rows& f(const T& v) {
        if (!newRow_) os_ << '\t';
        newRow_ = false;
        os_ << v;
        return *this;
    }
    Rows& s(const std::string& v) { return f(clean(v)); }
    std::string str() const { return os_.str(); }
private:
    bool newRow_ = true;
};

int toInt(const std::string& s, const char* what) {
    try {
        std::size_t pos = 0;
        int v = std::stoi(s, &pos);
        if (pos != s.size()) throw 0;
        return v;
    } catch (...) {
        throw AppError(std::string("Некорректное значение: ") + what);
    }
}

double toDouble(const std::string& s, const char* what) {
    std::string t = s;
    for (char& c : t) if (c == ',') c = '.';
    try {
        std::size_t pos = 0;
        double v = std::stod(t, &pos);
        if (pos != t.size()) throw 0;
        return v;
    } catch (...) {
        throw AppError(std::string("Некорректное значение: ") + what);
    }
}

}  // namespace

std::string CommandApi::execute(const std::vector<std::string>& args) {
    try {
        return "OK\n" + run(args);
    } catch (const std::exception& e) {
        return std::string("ERR\n") + e.what();
    } catch (...) {
        return "ERR\nНеизвестная ошибка";
    }
}

std::string CommandApi::run(const std::vector<std::string>& a) {
    if (a.empty()) throw AppError("Пустая команда");
    const std::string& cmd = a[0];
    auto need = [&](std::size_t n) {
        if (a.size() != n + 1) throw AppError("Команда " + cmd + ": ожидается аргументов: " + std::to_string(n));
    };
    auto save = [&] {
        if (!dataPath_.empty()) db_.saveToFile(dataPath_);
    };

    // Строки-представления объектов
    auto flightRows = [&](const GenericList<Flight>& list) {
        Rows r;
        for (const Flight& f : list) {
            r.row().f(f.id).s(f.number).f(f.airlineId).s(db_.airline(f.airlineId).name).s(f.from).s(f.to)
                .s(f.date).s(f.time).f(static_cast<int>(f.type)).f(f.seatsTotal).f(db_.freeSeats(f.id))
                .s(num(f.basePrice));
        }
        return r.str();
    };
    auto orderRows = [&](const GenericList<Order>& list) {
        Rows r;
        for (const Order& o : list) {
            const Flight& f = db_.flight(o.flightId);
            r.row().f(o.id).f(o.clientId).s(db_.client(o.clientId).fullName).f(o.flightId).s(f.number)
                .s(f.from + " → " + f.to).s(f.date + " " + f.time).f(static_cast<int>(o.serviceClass))
                .f(static_cast<int>(o.status)).s(num(o.price)).s(o.created);
        }
        return r.str();
    };

    // ---------- инициализация и файлы ----------
    if (cmd == "init") {  // init <path>: загрузить файл, при отсутствии — демоданные
        need(1);
        dataPath_ = a[1];
        std::ifstream probe(dataPath_);
        if (probe.good()) {
            probe.close();
            db_.loadFromFile(dataPath_);
            return "loaded";
        }
        db_.seedDemo();
        save();
        return "seeded";
    }
    if (cmd == "save") { need(1); db_.saveToFile(a[1]); return ""; }
    if (cmd == "load") { need(1); db_.loadFromFile(a[1]); save(); return ""; }
    if (cmd == "reset") { need(0); db_.seedDemo(); save(); return ""; }

    // ---------- списки ----------
    if (cmd == "airlines") {
        need(0);
        Rows r;
        for (const Airline& x : db_.airlines)
            r.row().f(x.id).s(x.code).s(x.name).s(x.country).f(db_.flightsByAirline(x.id).size());
        return r.str();
    }
    if (cmd == "flights") { need(0); return flightRows(db_.flights); }
    if (cmd == "clients") {
        need(0);
        Rows r;
        for (const Client& c : db_.clients) r.row().f(c.id).s(c.fullName).s(c.passport).s(c.phone).s(c.email);
        return r.str();
    }
    if (cmd == "orders") { need(0); return orderRows(db_.orders); }

    // ---------- запросы ----------
    if (cmd == "q_ordersByClient") { need(1); return orderRows(db_.ordersByClient(toInt(a[1], "клиент"))); }
    if (cmd == "q_searchFlights") { need(2); return flightRows(db_.searchFlights(a[1], a[2])); }
    if (cmd == "q_paidCount") { need(1); return std::to_string(db_.paidTicketsCount(toInt(a[1], "рейс"))); }
    if (cmd == "q_flightsByAirline") { need(1); return flightRows(db_.flightsByAirline(toInt(a[1], "авиакомпания"))); }
    if (cmd == "q_revenueFlight") { need(1); return num(db_.revenueByFlight(toInt(a[1], "рейс"))); }
    if (cmd == "q_revenueAirline") { need(1); return num(db_.revenueByAirline(toInt(a[1], "авиакомпания"))); }
    if (cmd == "q_passengers") {
        need(1);
        Rows r;
        for (const Passenger& p : db_.passengersOnFlight(toInt(a[1], "рейс")))
            r.row().f(p.client.id).s(p.client.fullName).s(p.client.passport).f(static_cast<int>(p.order.serviceClass))
                .f(static_cast<int>(p.order.status)).f(p.order.id);
        return r.str();
    }

    // ---------- операции ----------
    if (cmd == "createOrder") {  // clientId flightId class
        need(3);
        int id = db_.createOrder(toInt(a[1], "клиент"), toInt(a[2], "рейс"),
                                 serviceClassFromInt(toInt(a[3], "класс")));
        save();
        return std::to_string(id);
    }
    if (cmd == "setStatus") {  // orderId status
        need(2);
        db_.changeOrderStatus(toInt(a[1], "заявка"), orderStatusFromInt(toInt(a[2], "статус")));
        save();
        return "";
    }
    if (cmd == "addFlight") {  // number airlineId from to date time type seats price
        need(9);
        Flight f;
        f.number = a[1];
        f.airlineId = toInt(a[2], "авиакомпания");
        f.from = a[3];
        f.to = a[4];
        f.date = a[5];
        f.time = a[6];
        f.type = flightTypeFromInt(toInt(a[7], "тип рейса"));
        f.seatsTotal = toInt(a[8], "количество мест");
        f.basePrice = toDouble(a[9], "цена");
        int id = db_.addFlight(f);
        save();
        return std::to_string(id);
    }
    if (cmd == "removeFlight") { need(1); db_.removeFlight(toInt(a[1], "рейс")); save(); return ""; }
    if (cmd == "addClient") {  // name passport phone email
        need(4);
        int id = db_.addClient({0, a[1], a[2], a[3], a[4]});
        save();
        return std::to_string(id);
    }
    if (cmd == "editClient") {  // id name passport phone email
        need(5);
        db_.editClient({toInt(a[1], "клиент"), a[2], a[3], a[4], a[5]});
        save();
        return "";
    }
    if (cmd == "removeClient") { need(1); db_.removeClient(toInt(a[1], "клиент")); save(); return ""; }
    if (cmd == "addAirline") {  // code name country
        need(3);
        int id = db_.addAirline({0, a[1], a[2], a[3]});
        save();
        return std::to_string(id);
    }
    if (cmd == "removeAirline") { need(1); db_.removeAirline(toInt(a[1], "авиакомпания")); save(); return ""; }

    throw AppError("Неизвестная команда: " + cmd);
}
