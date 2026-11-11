// CommandApi.h — текстовый интерфейс к Database для Android (JNI).
// Ответ: "OK\n<данные>" или "ERR\n<сообщение>".
// Данные: строки через '\n', поля через '\t'.
#pragma once

#include <string>
#include <vector>

#include "Database.h"

class CommandApi {
public:
    explicit CommandApi(Database& db) : db_(db) {}
    std::string execute(const std::vector<std::string>& args);

    // Путь к рабочему файлу данных; после каждого изменения выполняется автосохранение.
    void setDataPath(const std::string& p) { dataPath_ = p; }

private:
    Database& db_;
    std::string dataPath_;

    std::string run(const std::vector<std::string>& a);
};
