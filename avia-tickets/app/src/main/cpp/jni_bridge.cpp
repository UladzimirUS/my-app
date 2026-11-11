// jni_bridge.cpp — связь Kotlin-интерфейса с ядром на C++.
#include <jni.h>

#include <mutex>
#include <string>
#include <vector>

#include "CommandApi.h"
#include "Database.h"

namespace {
Database g_db;
CommandApi g_api(g_db);
std::mutex g_mutex;

std::string toStd(JNIEnv* env, jstring s) {
    if (!s) return "";
    const char* chars = env->GetStringUTFChars(s, nullptr);
    std::string r(chars ? chars : "");
    if (chars) env->ReleaseStringUTFChars(s, chars);
    return r;
}

// NewStringUTF принимает modified UTF-8; кириллица и латиница в нём совпадают со стандартным UTF-8.
jstring toJava(JNIEnv* env, const std::string& s) {
    jbyteArray bytes = env->NewByteArray(static_cast<jsize>(s.size()));
    env->SetByteArrayRegion(bytes, 0, static_cast<jsize>(s.size()), reinterpret_cast<const jbyte*>(s.data()));
    jclass strCls = env->FindClass("java/lang/String");
    jmethodID ctor = env->GetMethodID(strCls, "<init>", "([BLjava/lang/String;)V");
    jstring enc = env->NewStringUTF("UTF-8");
    auto res = static_cast<jstring>(env->NewObject(strCls, ctor, bytes, enc));
    env->DeleteLocalRef(bytes);
    env->DeleteLocalRef(enc);
    env->DeleteLocalRef(strCls);
    return res;
}
}  // namespace

extern "C" JNIEXPORT jstring JNICALL
Java_com_kp_aviaorders_NativeCore_call(JNIEnv* env, jobject /*thiz*/, jobjectArray args) {
    std::vector<std::string> a;
    jsize n = env->GetArrayLength(args);
    for (jsize i = 0; i < n; ++i) {
        auto s = static_cast<jstring>(env->GetObjectArrayElement(args, i));
        a.push_back(toStd(env, s));
        env->DeleteLocalRef(s);
    }
    std::lock_guard<std::mutex> lock(g_mutex);
    return toJava(env, g_api.execute(a));
}
