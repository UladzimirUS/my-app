// Models.h — предметная область: авиакомпании, рейсы, клиенты, заявки.
#pragma once

#include <istream>
#include <ostream>
#include <string>
#include <vector>

// Тип рейса
enum class FlightType { Domestic = 0, International = 1 };
// Класс обслуживания
enum class ServiceClass { Economy = 0, Business = 1, First = 2 };
// Статус заявки
enum class OrderStatus { New = 0, Booked = 1, Paid = 2, Cancelled = 3 };

std::string toString(FlightType t);
std::string toString(ServiceClass c);
std::string toString(OrderStatus s);
FlightType flightTypeFromInt(int v);
ServiceClass serviceClassFromInt(int v);
OrderStatus orderStatusFromInt(int v);

// Коэффициент стоимости билета для класса обслуживания.
double classMultiplier(ServiceClass c);

// Проверка форматов ГГГГ-ММ-ДД и ЧЧ:ММ.
bool isValidDate(const std::string& d);
bool isValidTime(const std::string& t);
std::string today();

// Вспомогательные функции текстовой сериализации (поля через ';').
namespace ser {
std::string escape(const std::string& s);
std::vector<std::string> split(const std::string& line);
}

struct Airline {
    int id = 0;
    std::string code;     // код ИАТА, напр. "LO"
    std::string name;
    std::string country;
};

struct Flight {
    int id = 0;
    std::string number;   // номер рейса, напр. "LO123"
    int airlineId = 0;    // принадлежность авиакомпании
    std::string from;
    std::string to;
    std::string date;     // ГГГГ-ММ-ДД
    std::string time;     // ЧЧ:ММ
    FlightType type = FlightType::Domestic;
    int seatsTotal = 0;
    double basePrice = 0; // цена эконом-класса
};

struct Client {
    int id = 0;
    std::string fullName;
    std::string passport;
    std::string phone;
    std::string email;
};

struct Order {
    int id = 0;
    int clientId = 0;
    int flightId = 0;
    ServiceClass serviceClass = ServiceClass::Economy;
    OrderStatus status = OrderStatus::New;
    double price = 0;
    std::string created;  // дата создания
};

// Перегрузка операторов ввода/вывода в поток
std::ostream& operator<<(std::ostream& os, const Airline& a);
std::istream& operator>>(std::istream& is, Airline& a);
std::ostream& operator<<(std::ostream& os, const Flight& f);
std::istream& operator>>(std::istream& is, Flight& f);
std::ostream& operator<<(std::ostream& os, const Client& c);
std::istream& operator>>(std::istream& is, Client& c);
std::ostream& operator<<(std::ostream& os, const Order& o);
std::istream& operator>>(std::istream& is, Order& o);
