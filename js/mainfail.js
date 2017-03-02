/*
  perform search in Landsat 8 image
*/
function searchNASA(){
var urlnasa = "https://api.nasa.gov/planetary/earth/imagery?";
var nasaAPIkey = "&api_key=CEO7492s9W2fVT3sDfKZEvL76QBzHztC2rO5BDhb";
var lonNASA = document.getElementById('longmin').value;
var latNASA = document.getElementById('latmin').value;
var dateNASA =;
// concatenate query parameters into a single string
	parastringNASA = urlnasa
				 + "lon=" + searchExtent
	             + "&lat=" + maxRecs
	             + "&cloud_score=True" 
	             + nasaAPIkey

// use HTTP GET to perform query
	$.get(parastringNASA, showList);	

}



//NASA
			else{

				dateNASA = data["date"];
				idNASA = data["id"];
				urllandsat = data["url"];
				cloud = Number(data["cloud_score"])*100;
				// add a button for each item (so we can click to further query this item with its id)
				var btn = document.createElement('button');
				btn.setAttribute('class', "link");
				btn.setAttribute('name', urllandsat);
				btn.innerText="Landsat 8 image on" + dateNASA +", the percentage of the image covered by clouds is" + cloud + "%";
				
				// clicking on this button invokes clickItem() function
				btn.onclick=clickItem; 
				document.getElementById('listResults').appendChild(btn);


$.get(this.urllandsat,showpic);



/nasa 
    function showpic(data){
		var ele = document.getElementById('detailsOfRec');

			while (ele.firstChild) {
				ele.removeChild(ele.firstChild);
			}
			var pic = document.createElement('IMG');
			pic.setAttribute("src", data);
    		pic.setAttribute("width", "304");
   		 	pic.setAttribute("height", "228");
    		pic.setAttribute("alt", "The Landsat");
    		ele.appendChild(pic);
    }