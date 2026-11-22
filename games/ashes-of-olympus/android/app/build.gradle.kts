plugins {
    id("com.android.application")
}

// Wraps the shared game page (games/ashes-of-olympus/index.html) into a full HTML document in the APK assets.
abstract class GenerateGameAsset : DefaultTask() {
    @get:InputFile
    abstract val source: RegularFileProperty

    @get:OutputDirectory
    abstract val outputDir: DirectoryProperty

    @TaskAction
    fun run() {
        val out = outputDir.get().file("index.html").asFile
        out.parentFile.mkdirs()
        out.writeText(
            "<!doctype html>\n<html lang=\"ru\"><head><meta charset=\"utf-8\">" +
                "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no\">" +
                "</head><body>\n" + source.get().asFile.readText(Charsets.UTF_8) + "\n</body></html>\n",
            Charsets.UTF_8
        )
    }
}

val generateGameAsset = tasks.register<GenerateGameAsset>("generateGameAsset") {
    source.set(rootProject.layout.projectDirectory.file("../index.html"))
}

android {
    namespace = "com.uladzimirus.olympus"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.uladzimirus.olympus"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            // Signed with the debug key so the APK installs directly on a phone.
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

androidComponents {
    onVariants { variant ->
        variant.sources.assets?.addGeneratedSourceDirectory(generateGameAsset, GenerateGameAsset::outputDir)
    }
}
