$(function(){
        var ws;
        function connect(url){
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
	                     ws.send(msgs);        
                     }
        }
        
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