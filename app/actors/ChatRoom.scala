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
case class NewChatter[T,B](p:Promise[T])

case class Start(room:ActorRef)
case class KeepAlive()
case class Disconnect()

case class Msg(
    from:Option[String]= None,
    content:Option[String] = None,
    _type:Option[String]=Some("message"),
    _channel:Option[String] = Some("message"),
    _transferid : Option[String] = None 
   ){
    val localTimestamp = new java.sql.Timestamp(Calendar.getInstance().getTime().getTime())
}




object MessageImplicits{
  implicit def JsObject2Msg(value:JsObject):Msg={
      return Msg(
          from=(value\"from").asOpt[String],
          content=(value\"msg").asOpt[String],
          _transferid=(value\"_transferid").asOpt[String],
          _channel=(value\"_channel").asOpt[String],
          _type=(value\"_type").asOpt[String]
      )
   }
  implicit def Msg2JsObject(value:Msg):JsObject={
      return Json.obj(
          "from"->value.from,
          "msg"->value.content,
          "time"->value.localTimestamp,
          "_type"->value._type,
          "_channel"->value._channel,
          "_transferid"->value._transferid
     )
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
       //  chatRoom ! Msg(Some("Robot"),Some("Robot vagyok"))
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
     var chatters = List[ActorRef]()
     
     
     
     
	 def receive = {
	   case BindRoom(promise) => {
	     val chatter =  Akka.system.actorOf(Props[Chatter])
	     chatters=chatter::chatters
	     chatter ! NewChatter(promise)
	   }
	   case msg:Msg =>{	     
	        for (
	           chatter <- chatters
	           if chatter!=context.sender	           
	        ) {chatter ! msg}
	   } 
	   
	   case Disconnect => 
	      chatters = for (chatter <- chatters if (chatter!=context.sender))yield chatter
	      
	      
	 }
	 
}


class Chatter extends Actor{
     val uuid:String = java.util.UUID.randomUUID.toString
     val (out, chatChannel) = Concurrent.broadcast[JsObject]	
     def procede(msg:Msg)(chatroom: ActorRef) = {
       chatroom ! Msg(from=Some(uuid),
           content=msg.content,
           _channel=msg._channel,
           _transferid=msg._transferid,
           _type = msg._type)
       println(msg)
     }
     def disconnect(chatroom:ActorRef) ={
        chatroom ! Msg(from=Some(uuid),content=Some("disconnected"),_channel=Some("users"),_type=Some("status"))
        chatroom ! Disconnect
	    context.stop(self)
     }
     def receive = {
       case NewChatter(promise)=>{
             val chatroom = context.sender
             chatroom ! Msg(from=Some(uuid),content=Some("connected"),_channel=Some("users"),_type=Some("status"))
	          val in = Iteratee.foreach((msg:JsObject)=>{procede(msg)(chatroom)}  ).mapDone(_=>{
		        disconnect(chatroom)
		    })
		    val res = (in,out)
	        promise.success(res)
       }
       case msg:Msg=> chatChannel.push(msg)
   }
}

