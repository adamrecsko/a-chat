

function AsyncStream(){
    this.onFeeds = new Array(); 
    this.pipes = new Array();
    this._parent = false;
    this._foreach = function(data){};
    this._filter  = function(data){return true};
    this._map  = function(data){return data};
    this.pipe = function(stream){
        stream._parent = this;
        this.pipes.push(stream);
    }
    this.map = function(func){
         var result = this.clone();
         result._map = func;
         return result;
    }
    this.filter = function(func){
         var result = this.clone();
         result._filter = func;
         return result;
    }

    this.foreach = function(func){
       var result = this.clone();
       result._foreach = func;
       return result;
    }

    this.feed = function(data){
         for (var i = 0; i < this.onFeeds.length; i++) {
             var onfeed = this.onFeeds[i];
             onfeed(data);
         }
         var _data = this._map(data);
         if (this._filter(_data)){
            this.broadcast(_data);
            this._foreach(_data);
         }
         
    }
    this.broadcast=function(data){
        for (var i = 0; i < this.pipes.length; i++) {
             var stream = this.pipes[i];
             stream.feed(data);
         }
    }

    this.onFeed = function(func){
        this.onFeeds.push(func);
    }

    this.clone = function(){
        var result = new AsyncStream();
        this.pipe(result);
        return result;
    }
    
    this.closePipe =function(stream){
         /**/
    }
    this.close = function(){
        if (this._parent){
            this._parent.closePipe(this);
            this._parent.close();
        }
    }


}

function Promise(){
     this._empty = function(data){};
     this._data;
     this._err;
     this.success = function(data){
        this._data = data;
        this._onsuccess(data);
        this.onSuccess(this._empty);
        this.onFailed(this._empty);
     };
     this.failed = function(err){
        this._err = err;
        this._onfailed(err);
        this.onSuccess(this._empty);
        this.onFailed(this._empty);
     };  
     this._onsuccess = function(data){};
     this._onfailed = function(err){};
     this.onSuccess = function(func){ 
         this._onsuccess = func;
         return this;
     };
     this.onFailed  = function(func){ 
         this._onfailed = func;
         return this; 
     };
}



function Event(){

}


function UUID(){
    return (new Date).getTime()+"-"+parseInt(Math.random()*100000001);
}

function ChannelManager(websocketService){
    this.messageStream =  new AsyncStream();
    this.websocketService = websocketService;
    this.confirmations = new Array();
    this.onMessage = function(data){
        var message = JSON.parse(data);
        this.messageStream.feed(message);
    }
    this.bind=function(channel,func){  // to channel
       return this.getStream()
          .filter(function(msg){
            return msg._channel==channel;
        }).foreach(func);
    }
    this.newMsg = function(channel){
       var msg = {};
       msg._messageid = UUID();
       msg._channel = channel;

       return msg;
    }
    
    
    this.sure= function(channel,msg,timeout){
       var promise = new Promise();
       msg._channel=channel;
       msg._transferid = UUID();
       data = JSON.stringify(msg);
       this.confirmations[msg._transferid]=promise;
       if (timeout>0){
             setTimeout(function(){
              var error = Error("Timeout Error");
              error.data = msg;
              promise.failed(error);
             },timeout);
       }
       this.websocketService.send(data);
       return promise;
    }

    this.resend= function(msg,timeout){
       var promise = new Promise(); 
       data = JSON.stringify(msg);
       this.confirmations[msg._transferid]=promise;
       if (timeout>0){
             setTimeout(function(){
              var error = Error("Timeout Error");
              error.data = msg;
              promise.failed(error);
             },timeout);
       }
       this.websocketService.send(data);
       return promise;
    }

    this.push= function(channel,msg){
       msg._channel=channel;
       data = JSON.stringify(msg);
       this.websocketService.send(data);
    }
    
    _self = this;
    this.confirmationAction = function(msg){
         var transferid = msg._transferid;
         if (_self.confirmations[transferid]!=undefined){
            _self.confirmations[transferid].success(msg);
            delete _self.confirmations[transferid];
         }
    }

    this.getStream = function(){
        return this.messageStream.clone()
    }

    //init
    this.bind("_confirmation",this.confirmationAction);
}


function  ComService (options)  {
     self = this;
     this.ws = false;
     this.channelManager = new ChannelManager(this);
     
     this.defaults = {
        onConnect: function(event){},
        onOpen: function(event){},
        onClose: function(event){},
        onMessage: function(event){},
        onError: function(event){},
        url : "ws://localhost",
        reconnect:true,
     };
     jQuery.extend(this.defaults, options);     
     
     this.onConnect = function(event){
        this.defaults.onConnect(event);
     }
     this.onOpen = function(event){
        this.defaults.onOpen(event);
     
     }
     this.onClose = function(event){
        this.defaults.onClose(event);
     
     }
     this.onMessage = function(event){
        this.channelManager.onMessage(event.data);
        this.defaults.onMessage(event);
     
     }
     this.onError = function(event){
        this.defaults.onError(event);
     }
     
     this.on = function(channel,func){
        this.channelManager.bind(channel,func);
     }

     this.sure= function(channel,msg,timeout){
        return this.channelManager.sure(channel,msg,timeout);
     }

     this.push=function(channel,msg){
         this.channelManager.push(channel,msg);
     }
     this.newMsg = function(channel){
        return this.channelManager.newMsg(channel);
     }
     
     this.send = function(msg){
        this.ws.send(msg);
     }

     this.resend = function(msg,timeout){
        return this.channelManager.resend(msg,timeout);
     }
     
     
    
     this.bindEvents = function(websocket){
         websocket.onopen = function(evt) { self.onOpen(evt) };
         websocket.onclose = function(evt) { self.onClose(evt) };
         websocket.onmessage = function(evt) {self.onMessage(evt) };
         websocket.onerror = function(evt) { self.onError(evt) };
         return websocket;
     }

     this.reconnect = function(){
         this.connect(this.defaults.url);
     }

     this.connect = function(url){
         if (this.ws) this.ws.close();
         this.onConnect(new Event());
         this.ws = new WebSocket(url);
         return this.bindEvents(this.ws);
     }  

     this.getMessageStream=function(){
         return this.channelManager.getStream();
     }
     this.getChannel = function(channel){
        return  this.getMessageStream().filter(function(msg){return msg._channel==channel});
     }

     this.reconnect();


     setInterval(function(){
        var msg = {};
        msg._channel = "users";
        msg._type="status";
        msg.msg = "alive";
        self.push('users',msg);
     },5000);
}

var service = new ComService({
    url: "ws://"+window.location.host+"/chat",
    onClose: function(){
        setTimeout(function(){service.reconnect()},2000);
    }
 });


function appendMsg(msg,msgtype){
       var fmsg= '<div class="panel  panel-'+msgtype+'">'+
                  '<div class="panel-heading">'+msg.from +"("+(new Date(msg.time))+'</div>'+
                  '<div class="panel-body">'+
                    msg.msg+
                  '</div>'+
                '</div>';
               $msg = $(fmsg);
               $(".income").append($msg);
               $("#chatbox").scrollTop( $("#chatbox").scrollTop()+200);
               return $msg;

}

//service.getMessageStream().foreach(function(msg){console.log(msg)});

var messages = service.getChannel("message").foreach(function(msg){
     appendMsg(msg,'success'); 
     msg.msg = "OK";
     service.push("_confirmation",msg);
});


var statuses = service.getChannel("users")
   .filter(function(msg){return msg._type=="status"});


var connecteds    = statuses
       .filter(function(msg){return msg.msg=="connected"})
       .foreach(function(msg){
        var from = msg.from;
        $(".users").append('<li class="'+from+'">'+from+'</li>');
   });

var disconnecteds = statuses
       .filter(function(msg){return msg.msg=="disconnected"})
       .foreach(function(msg){
        var from = msg.from;
        $("."+from).remove();
   });

var alives = statuses
  .filter(function(msg){
      return msg.msg ==  "alive";
  }).foreach(function(msg){
      var from = msg.from;
      var user  = $("."+from);
      if (user.length == 0) {
         $(".users").append('<li class="'+from+'">'+from+'</li>');
      }
  });

//service.on("message",);

/*
service.on("users",function(msg){
     var from = msg.from;
     var _type = msg._type;

     if (_type=="status"){

        if (msg.content=="connected"){
             $(".users").append('<li class="'+from+'">'+from+'</li>');
        }
     }
    
});
*/


function send(){
       var message = $("#text1").val();
       message = message.trim();
       if (message!=""){
          var msg = service.newMsg("message");
          msg.msg = message;
          msg.time=(new Date());
          msg.from="Én";
          $msg = appendMsg(msg,'info');

          var failed = function(err){ 
              var msg = err.data;
              
              this.mymsg = $($msg);
              console.log(this.mymsg);

              
              $(this.mymsg).removeClass('panel-info').addClass('panel-warning');
              service.resend(msg,5000)
               .onFailed(failed)
               .onSuccess(success);
          }
          
          var success = function(data){
                var $mymsg = $($msg);
                $($mymsg).removeClass('panel-info')
                .removeClass('panel-warning')
                .addClass('panel-success');
          }

          service.sure("message",msg,5000)
           .onFailed(failed)
           .onSuccess(success);

        //  console.log(promise);     
       }
}
        
$(function(){

        $("#text1").keypress(function(e) {
            if(e.which == 13) {
                send();
                $("#text1").val("");
            }
        });
        $("#send").click(function(){
                   send();
                     
        });
});






/*

var ws;

function connect(url){
            console.log("connect");
           if (ws)  ws.close();
           ws =new WebSocket(url);
           ws.onmessage = function (event) {
			   var messageFromServer = event.data;  
			   var msg = JSON.parse(messageFromServer);
			   
			   var fmsg= '<div class="panel  panel-info">'+
  '<div class="panel-heading">'+msg.from +"("+(new Date(msg.time))+'</div>'+
  '<div class="panel-body">'+
    msg.msg+
  '</div>'+
'</div>';
							   
			   
			   
			//   $(".income").append("<li>"+msg.from +"("+(new Date(msg.time))+"):<h3>"+msg.msg+"</h3></li>"); 
			
			   $(".income").append(fmsg);
			   $("#chatbox").scrollTop( $("#chatbox").scrollTop()+200);
			   console.log(messageFromServer);
		   }; 
		   ws.onclose = function(){
		       console.log("WS closed, try, to reconnect");
		       
               setTimeout(function(){
              
               
               connect(url)
               
               }, 3000);
           };
        }
        var chatUrl = "ws://"+window.location.host;
        connect(chatUrl+"/chat");

        function send(){
                     var message = $("#text1").val();
                     message = message.trim();
                     if (message!=""){
	                     var msg = {"msg":$("#text1").val()};
	                     var msgs = JSON.stringify(msg);
	                     console.log(msgs);


                        // var promise =  service.sure("message",msg);
	                     ws.send(msgs);        
                     }
        }
        



$(function(){

        $("#text1").keypress(function(e) {
		    if(e.which == 13) {
		        send();
		        $("#text1").val("");
		    }
		});
        $("#send").click(function(){
                   send();
                     
        });
});


*/