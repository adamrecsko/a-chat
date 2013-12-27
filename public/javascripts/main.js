$(function(){


        var ws = $.gracefulWebSocket("ws://rocky-thicket-8654.herokuapp.com/chat");


        $("#connect").click(function(){
           var chat = $("#chatselect").val();
           ws.close();
           ws = $.gracefulWebSocket("ws://rocky-thicket-8654.herokuapp.com/"+chat);
           
           
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