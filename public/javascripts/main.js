

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
    this.websocketService = websocketService;
    this.channels = new Array();
    this.confirmations = new Array();
    this.onMessage = function(data){
        var message = JSON.parse(data);
        var channel = message._channel;
        if (this.channels[channel] != undefined){
            fnc = this.channels[channel];
            fnc(message);
        }
    }
    this.bind=function(channel,func){
        this.channels[channel]=func;
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
         }
    }
    //init
    this.bind("_confirmation",this.confirmationAction);
}


function  ComService (options)  {
     self = this;
     this.ws = false;
     this.channelManager = new ChannelManager(this);
     
     this.defaults = {
        onConnect: function(event){console.log(event);},
        onOpen: function(event){console.log(event);},
        onClose: function(event){console.log(event);},
        onMessage: function(event){},
        onError: function(event){console.log(event);},
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
     
     
    
     this.bindEvents = function(websocket){
         websocket.onopen = function(evt) { self.onOpen(evt) };
         websocket.onclose = function(evt) { self.onClose(evt) };
         websocket.onmessage = function(evt) { console.log(evt); self.onMessage(evt) };
         websocket.onerror = function(evt) { self.onError(evt) };
         return websocket;
     }

     this.connect = function(url){
         if (this.ws) this.ws.close();
         this.onConnect(new Event());
         this.ws = new WebSocket(url);
         return this.bindEvents(this.ws);
     }  
     this.connect(this.defaults.url);
     
     
     
}

var service = new ComService({
    url: "ws://"+window.location.host+"/chat",
    
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
service.on("message",function(msg){
     appendMsg(msg,'success'); 
     msg.msg = "OK";
     service.push("_confirmation",msg);
});



function send(){
       var message = $("#text1").val();
       message = message.trim();
       if (message!=""){
          var msg = service.newMsg("message");
          msg.msg = message;
          msg.time=(new Date());
          msg.from="Én";
          $msg = appendMsg(msg,'info');
          service.sure("message",msg,5000)
           .onFailed(function(err){  alert("Nem sikerült elküldeni az üzenetet.") })
           .onSuccess(function(data){
                $($msg).removeClass('panel-info').addClass('panel-success');
           });

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