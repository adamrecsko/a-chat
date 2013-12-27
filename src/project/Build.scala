import sbt._
import Keys._
import play.Project._

object ApplicationBuild extends Build {

  val appName         = "ironclad"
  val appVersion      = "1.0-SNAPSHOT"

  val appDependencies = Seq(
    // Add your project dependencies here,
    "com.github.aselab" %% "scala-activerecord" % "0.2.2",
    "com.github.aselab" %% "scala-activerecord-play2" % "0.2.2",
    jdbc,
    anorm
  )


  val main = play.Project(appName, appVersion, appDependencies).settings(
    // Add your own project settings here      
  )

}
