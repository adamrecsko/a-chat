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
case class JoinToRoom[T](p: Promise[T],roomName:String)
case class BindRoom[T](p: Promise[T])
case class NewChatter[T,B](p:Promise[T],out:Enumerator[B])
case class Msg[T](msg:T)
case class Start(room:ActorRef)
case class KeepAlive()

object ChatRoom {
  val chatRooms = Akka.system.actorOf(Props[ChatRooms[String]])
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
		      30 seconds,
		      30 seconds,
		      self,
		      KeepAlive
		    )
       
       } 
       case KeepAlive =>{
         chatRoom ! Msg("["+counter+"] Robot vagyok!")
         counter+=1
       } 
     }
     
    
     
}

class ChatRooms[T] extends Actor{
    var rooms = Map[String,ActorRef]()
    def receive = {
      case JoinToRoom(promise,roomName)=>
        val room = rooms.getOrElse(roomName, {
            val actor =  Akka.system.actorOf(Props[ChatRoom[String]]) 
            val chatRobot = Akka.system.actorOf(Props[ChatRobot]) 
            chatRobot ! Start(actor)
            rooms+= (roomName->actor)
            actor
           }); 
        room ! BindRoom(promise)
        
    }
}

class ChatRoom[T] extends Actor {
     val (out, chatChannel) = Concurrent.broadcast[String]	
	 def receive = {
	   case BindRoom(promise) => {
	     val chatter =  Akka.system.actorOf(Props[Chatter[String]]) 
	     chatter ! NewChatter(promise,out)
	   }
	   case Msg(msg:String) =>{
	     val pushMsg = Calendar.getInstance().getTime().toString()  + " : " +msg
	     chatChannel.push(pushMsg)
	   } 
	 }
	 
}


class Chatter[T] extends Actor{
     def procede(msg:String)(chatroom: ActorRef) = {
       chatroom ! Msg(msg)
       println(msg)
     }
     def disconnect(chatroom:ActorRef) ={
        procede("By")(chatroom)
	    context.stop(self)
     }
     def receive = {
       case NewChatter(promise,out)=>{
             val chatroom = context.sender
	          val in = Iteratee.foreach((msg:String)=>{ procede(msg)(chatroom)}  ).mapDone(_=>{
		        disconnect(chatroom)
		    })
		    val res = (in,out)
	        promise.success(res)
       }
   }
}

