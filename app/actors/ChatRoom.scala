package actors

import play.api.libs.iteratee.Concurrent
import play.api.libs.concurrent.Akka
import play.api.Play.current
import akka.actor.Props
import akka.actor.Actor
import scala.concurrent.Promise
import scala.concurrent.Future
import scala.util.Try
import play.api.libs.iteratee.Iteratee
import akka.actor.ActorRef
import play.api.libs.iteratee.Enumerator
import scala.concurrent.duration._
import java.util.Calendar
import play.api.libs.json.JsObject
import play.api.libs.json.JsString
import play.api.libs.json.JsValue
import play.api.libs.json.Json
import play.api.libs.json.JsObject
case class JoinToRoom[T](p: Promise[T],roomName:String)
case class BindRoom[T](p: Promise[T])
case class NewChatter[T,B](p:Promise[T],out:Enumerator[B])

case class Start(room:ActorRef)
case class KeepAlive()
case class Disconnect()

case class Msg(from:String, content:String){
    val localTimestamp = new java.sql.Timestamp(Calendar.getInstance().getTime().getTime())
}




object MessageImplicits{
  implicit def JsObject2Msg(value:JsObject):Msg={
      return Msg(from=(value\"from").toString(),content=(value\"msg").as[String])
   }
  implicit def Msg2JsObject(value:Msg):JsObject={
      return Json.obj("from"->value.from,"msg"->value.content,"time"->value.localTimestamp)
   }
}

import MessageImplicits._

object ChatRoom {
  val chatRooms = Akka.system.actorOf(Props[ChatRooms[JsValue]])
  def join[T](room:String): Future[T] = {
     val prom = Promise[T]
     chatRooms ! JoinToRoom(prom,room)     
     prom.future
  }
}


class ChatRobot extends Actor {
     var chatRoom:ActorRef = null
     var counter:Int = 0
     def receive={
       case Start(room) => {
          chatRoom = room
          import play.api.libs.concurrent.Execution.Implicits._
		  Akka.system.scheduler.schedule(
		      1 minutes,
		      1 minutes,
		      self,
		      KeepAlive
		    )
       
       } 
       case KeepAlive =>{
         chatRoom ! Msg("Robot","Robot vagyok")
         counter+=1
       } 
     }
     
    
     
}

class ChatRooms[T] extends Actor{
    var rooms = Map[String,ActorRef]()
    def receive = {
      case JoinToRoom(promise,roomName)=>
        val room = rooms.getOrElse(roomName, {
            val actor =  Akka.system.actorOf(Props[ChatRoom[T]]) 
            val chatRobot = Akka.system.actorOf(Props[ChatRobot]) 
            chatRobot ! Start(actor)
            rooms+= (roomName->actor)
            actor
           }); 
        room ! BindRoom(promise)
        
    }
}

class ChatRoom[T] extends Actor {
     val (out, chatChannel) = Concurrent.broadcast[JsObject]	
	 def receive = {
	   case BindRoom(promise) => {
	     val chatter =  Akka.system.actorOf(Props[Chatter]) 
	     chatter ! NewChatter(promise,out)
	   }
	   case msg:Msg =>{	     
	     chatChannel.push(msg)
	   } 
	   
	   case Disconnect =>
	      
	 }
	 
}


class Chatter extends Actor{
     val uuid:String = java.util.UUID.randomUUID.toString
     def procede(msg:Msg)(chatroom: ActorRef) = {
       chatroom ! Msg(from=uuid, content=msg.content)
       println(msg)
     }
     def disconnect(chatroom:ActorRef) ={
        chatroom ! Msg(from=uuid,content="User disconnected")
        chatroom ! Disconnect
	    context.stop(self)
     }
     def receive = {
       case NewChatter(promise,out)=>{
             val chatroom = context.sender
	          val in = Iteratee.foreach((msg:JsObject)=>{ procede(msg)(chatroom)}  ).mapDone(_=>{
		        disconnect(chatroom)
		    })
		    val res = (in,out)
	        promise.success(res)
       }
   }
}

