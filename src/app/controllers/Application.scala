package controllers

import play.api._
import play.api.mvc._
import play.api.data._
import play.api.data.Forms._
import play.api.libs.iteratee.Iteratee
import play.api.libs.iteratee.Enumerator
import scala.concurrent.Future
import play.api.libs.concurrent.Execution.Implicits._
import play.api.libs.iteratee.Concurrent
import actors.ChatRoom
object Application extends Controller {
  
  val (out, chatChannel) = Concurrent.broadcast[String]

  
  def index = Action {
      Ok(views.html.index()  )
  }

  def chat = WebSocket.async[String] {
      request => {   
         ChatRoom.join("chat1")
      }
  }
  
    def chat2 = WebSocket.async[String] {
      request => {   
         ChatRoom.join("chat2")
      }
  }
  
}