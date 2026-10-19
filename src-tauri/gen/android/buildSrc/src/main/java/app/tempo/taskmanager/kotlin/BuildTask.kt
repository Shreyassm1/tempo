import java.io.File
import org.apache.tools.ant.taskdefs.condition.Os
import org.gradle.api.DefaultTask
import org.gradle.api.GradleException
import org.gradle.api.logging.LogLevel
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.TaskAction

open class BuildTask : DefaultTask() {
    @Input
    var rootDirRel: String? = null
    @Input
    var target: String? = null
    @Input
    var release: Boolean? = null

    @TaskAction
    fun assemble() {
        val rootDirRel = rootDirRel ?: throw GradleException("rootDirRel cannot be null")
        val target = target ?: throw GradleException("target cannot be null")
        val release = release ?: false

        val abi = when (target) {
            "aarch64", "aarch64-linux-android" -> "arm64-v8a"
            "arm", "armv7", "armv7-linux-androideabi" -> "armeabi-v7a"
            "i686", "i686-linux-android" -> "x86"
            "x86_64", "x86_64-linux-android" -> "x86_64"
            else -> target
        }
        val targetDir = File(project.projectDir, "src/main/jniLibs/$abi")
        targetDir.mkdirs()
        val targetSo = File(targetDir, "libtempo_lib.so")

        val rustTarget = when (target) {
            "aarch64" -> "aarch64-linux-android"
            "arm", "armv7" -> "armv7-linux-androideabi"
            "i686" -> "i686-linux-android"
            "x86_64" -> "x86_64-linux-android"
            else -> target
        }

        val profile = if (release) "release" else "debug"
        val candidates = listOf(
            File(project.projectDir, "$rootDirRel/src-tauri/target/$rustTarget/$profile/libtempo_lib.so"),
            File(project.projectDir, "$rootDirRel/target/$rustTarget/$profile/libtempo_lib.so"),
            targetSo
        )

        for (cand in candidates) {
            if (cand.exists() && cand.length() > 0) {
                if (cand.absolutePath != targetSo.absolutePath) {
                    cand.copyTo(targetSo, overwrite = true)
                }
                println("SUCCESS: Verified libtempo_lib.so (" + targetSo.length() + " bytes) in " + targetSo.absolutePath)
                return
            }
        }

        val executable = """npm""";
        try {
            runTauriCli(executable)
        } catch (e: Exception) {
            if (Os.isFamily(Os.FAMILY_WINDOWS)) {
                runTauriCli("$executable.cmd")
            } else {
                throw e;
            }
        }
    }

    fun runTauriCli(executable: String) {
        val rootDirRel = rootDirRel ?: throw GradleException("rootDirRel cannot be null")
        val target = target ?: throw GradleException("target cannot be null")
        val release = release ?: throw GradleException("release cannot be null")
        val args = listOf("run", "--", "tauri", "android", "android-studio-script");

        project.exec {
            workingDir(File(project.projectDir, rootDirRel))
            executable(executable)
            args(args)
            if (project.logger.isEnabled(LogLevel.DEBUG)) {
                args("-vv")
            } else if (project.logger.isEnabled(LogLevel.INFO)) {
                args("-v")
            }
            if (release) {
                args("--release")
            }
            args(listOf("--target", target))
        }.assertNormalExitValue()
    }
}