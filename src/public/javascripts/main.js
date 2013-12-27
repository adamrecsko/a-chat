$(function(){


        var ws = $.gracefulWebSocket("ws://localhost:9000/chat");


        $("#connect").click(function(){
           var chat = $("#chatselect").val();
           ws.close();
           ws = $.gracefulWebSocket("ws://localhost:9000/"+chat);
           
           
           ws.onmessage = function (event) {
		   var messageFromServer = event.data;  
		   
		   $(".income").append("<li>"+messageFromServer+"</li>"); 
		   console.log(messageFromServer);
		   };
        });
        
        $("#send").click(function(){
                     ws.send($("#text1").val());
                     
        });
		ws.onmessage = function (event) {
		   var messageFromServer = event.data;  
		   
		   $(".income").append("<li>"+messageFromServer+"</li>"); 
		   console.log(messageFromServer);
		};

});