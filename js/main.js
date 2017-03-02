/* global variables */

// geoserver
var geoserverws = "http://localhost:8080/geoserver/wsguiming"
//var geoserverws = "http://168.62.234.206:8080/geoserver/wsguiming"

// default parameters
var fileFormat = "Raster";
var epsg = "EPSG:4326";
var outEPSG = "EPSG:same as the source";
var downloadUrl = "";
var zipFilename = "";

// user-specified extent
var latmin;
var latmax;
var longmin;
var longmax;

// extent of the original layer
var lyrlatmin;// = -90;
var lyrlatmax;// = 90;
var lyrlongmin;// = -180;
var lyrlongmax;// = 180;

var wmslyr;
var lyrname;
var maskwmslyr;
var map;
var layerControl;
var polygon;

var keywords;
var usrspec = false;


/*
  handle keyword change
*/
function keywordchange(){
	keywords = document.getElementById('keyword').selectedOptions[0].text

	if(keywords == "--user specify--"){
		usrspec = true;
		var inputtext = document.getElementById("keywordinput");
		inputtext.value = null;
		inputtext.style.visibility = "visible";
		inputtext.focus();

	}
	else{
		usrspec = false;
		var inputtext = document.getElementById("keywordinput");
		inputtext.style.visibility = "hidden";
	}
}

/**
  perform search in ScienceBase
*/
function search(){
	
	// topical keywords
	//keywords = document.getElementById('keyword').value;
	keywords = document.getElementById('keywordinput').value;
	
	// query geographic extent
	latmin = document.getElementById('latmin').value;
	latmax = document.getElementById('latmax').value;
	longmin = document.getElementById('longmin').value;
	longmax = document.getElementById('longmax').value;
	extent = [longmin, latmin, longmax, latmax];
	searchExtent = "searchExtent=[" + extent + "]";
	
	// maximum number of records returned
	maxRecs = 20;

	// limit category to "Data"
	category = "filter=browseCategory=Data";
	
	// limit type to "Shapefile" OR "GeoTIFF"
	type = "filter=browseType=Shapefile&filter=browseType=GeoTIFF&conjunction=browseType=OR"
	
	// limit extention to "Shapefile" OR "Raster"
	extention = "filter=facets.facetName=Raster&filter=facets.facetName=Shapefile&conjunction=facets.facetName=OR";	
	
	// retrieve title in query
	fields = "fields=title";
	
	// query results returned in json format
	format = "format=json";	
	
	// concatenate query parameters into a single string
	parastring = "q=" + keywords
				 + "&" + searchExtent
	             + "&max=" + maxRecs
	             + "&" + category
	             + "&" + type
	             + "&" + extention
	             + "&" + fields 
	             + "&" + format;
	
	// use HTTP GET to perform query
	$.get("https://www.sciencebase.gov/catalog/items?"+parastring, showList);	
}

/**
 show query results in a list
 */
function showList(data, status){
	// clear out things to start over
	var ele = document.getElementById('detailsOfRec');
	while (ele.firstChild) {
		ele.removeChild(ele.firstChild);
	}		
	var ele = document.getElementById('listResults');
	while (ele.firstChild) {
		ele.removeChild(ele.firstChild);
	}
	
	// populate the list	
	if(status != "success"){
		document.getElementById('listResults').innerText=status;
	}else{
		for(i=0; i<data["items"].length; i++){
			id = data["items"][i]["id"];
			title = data["items"][i]["title"];

			if(title.toLowerCase().includes(keywords.toLowerCase())){
				// add a button for each item (so we can click to further query this item with its id)
				var btn = document.createElement('button');
				btn.setAttribute('class', "link");
				btn.setAttribute('id', id);
				btn.innerText=title;
				// clicking on this button invokes clickItem() function
				btn.onclick=clickItem; 
				document.getElementById('listResults').appendChild(btn);

				// separate the items (buttons) a bit
				var br = document.createElement('br');
				document.getElementById('listResults').appendChild(br);
				br = document.createElement('br');
				document.getElementById('listResults').appendChild(br);
			}
		}
		/*for(i=0; i<data["items"].length; i++){
			id = data["items"][i]["id"];
			title = data["items"][i]["title"];

			if(!title.toLowerCase().includes(keywords.toLowerCase())){
				// add a button for each item (so we can click to further query this item with its id)
				var btn = document.createElement('button');
				btn.setAttribute('class', "link");
				btn.setAttribute('id', id);
				btn.innerText=title;
				// clicking on this button invokes clickItem() function
				btn.onclick=clickItem; 
				document.getElementById('listResults').appendChild(btn);

				// separate the items (buttons) a bit
				var br = document.createElement('br');
				document.getElementById('listResults').appendChild(br);
				br = document.createElement('br');
				document.getElementById('listResults').appendChild(br);
			}
		}*/
	}
}

/**
  what happens when clicking each individual item in the list
*/
function clickItem(){
	// use HTTP GET to perform search of each individual item based on item id
	$.get("https://www.sciencebase.gov/catalog/item/"+this.id+"?format=json", showDetails);
    
    // show details of this item
    function showDetails(data, status){
		if(status != "success"){
			document.getElementById('detailsOfRec').innerText=status;
		}else{
			//clear out old stuff to start over
			var ele = document.getElementById('detailsOfRec');
			while (ele.firstChild) {
				ele.removeChild(ele.firstChild);
			}
			
			// Title section
			var titleH = document.createElement('h1');
			titleH.innerText = data["title"];
			ele.appendChild(titleH);

			// Data retrieval section
			if(typeof data["facets"] != 'undefined'){
				var downloadH = document.createElement('h1');
				downloadH.innerText = "Data Retrieval";
				ele.appendChild(downloadH);

				var metaContent = document.createElement('p');
				fileFormat = "Raster";

				// figure out file format
				for(var i = 0; i < data["facets"].length; i++){
					if(data["facets"][i]["className"] == 'gov.sciencebase.catalog.item.facet.ShapefileFacet'){
						fileFormat = "Vector";
						epsg = data["facets"][i]["nativeCrs"];
						break;
					}
					if(data["facets"][i]["className"] == 'gov.sciencebase.catalog.item.facet.RasterFacet'){
						fileFormat = "Raster";
						epsg = data["facets"][i]["nativeCrs"];
						break;
					}				
				}
				
				if((epsg == '') || (typeof epsg == 'undefined')){
					epsg = "EPSG:4326";
				}
				metaContent.innerHTML = "Data layer is in <b>" + fileFormat + "</b> format and in projection <b>" + epsg + "</b>.";
				ele.appendChild(metaContent);

				// direct download			
				if(typeof data["distributionLinks"] != 'undefined'){
					for (var i = 0; i < data["distributionLinks"].length; i++) {
						if(data["distributionLinks"][i]["type"] == "downloadLink"){
							downloadUrl = data["distributionLinks"][i]["uri"];
							zipFilename = data["distributionLinks"][i]["name"];
						}
					}				
				}
				
				var dbutton = document.createElement('button');
				dbutton.id = 'dbtn';
				//dbutton.style = "display:inline-block";
				dbutton.innerHTML = "Download Full";
				dbutton.onclick = download;
				ele.appendChild(dbutton);				
				
				var tip = document.createElement('p');
				tip.id = "dbtntipid";
				tip.style = "display:inline-block";
				tip.innerHTML = "&nbsp;&nbsp;[A save link will show up once it is ready]";
				ele.appendChild(tip);
				ele.appendChild(document.createElement('br'));
				
				var rbutton = document.createElement('button');
				rbutton.id = 'mdbtn';
				//rbutton.style = "display:inline-block";
				rbutton.innerHTML = "Mask and Download";
				rbutton.onclick = reproject_download;
				ele.appendChild(rbutton);

				var tip = document.createElement('p');
				tip.id = "mdbtntipid";
				tip.style = "display:inline-block";
				tip.innerHTML = "&nbsp;&nbsp;[A save link will show up once it is ready]<br>";
				ele.appendChild(tip);
				
			}

			// Interactive map
			var Lmap = document.createElement('div');
			Lmap.id = "map";			
			ele.appendChild(Lmap);
			//create a map object
			map = L.map('map').setView([0, 0], 0);
			//base layers
			var grayscale = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
				maxZoom: 18,
				id: 'mapbox.light'
			}).addTo(map);

			var streetmap = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
				maxZoom: 18,
				id: 'mapbox.streets'
			}).addTo(map);

			// wms layer
			var wmsurl = "https://www.sciencebase.gov/catalogMaps/mapping/ows/554ce92be4b082ec54129d8b?service=wms&request=getcapabilities&version=1.3.0";
			
			if(typeof data["distributionLinks"] != 'undefined'){
				for (var i = 0; i < data["distributionLinks"].length; i++) {
					if(data["distributionLinks"][i]["title"] == "ScienceBase WMS Service"){
						wmsurl = data["distributionLinks"][i]["uri"];
					}
				}				
			}

			// figure out the layer name
			$.get(wmsurl, function(res){
				lyrname = "";
				var lyrs = res.getElementsByTagName("Capability")[0].getElementsByTagName("Layer");
				for(var i = 0; i < lyrs.length; i++){
					var val = lyrs[i].getElementsByTagName("Name")[0].childNodes[0].nodeValue;
					if(val == "sb:footprint" || val == "footprint" || val == "sb:boundingBox"  || val == "boundingBox"){						
					}else{
						lyrname = lyrs[i].getElementsByTagName("Name")[0].childNodes[0].nodeValue;
						break;
					}
				}
				
				wmslyr = L.tileLayer.wms(wmsurl, {
				    layers: lyrname,				
				    format: 'image/png',
				    transparent: true
				});
				map.addLayer(wmslyr);
				
				// unseens layer
				maskwmsurl = geoserverws + "/wms"; // test only				
				maskwmslyr = L.tileLayer.wms(maskwmsurl, {
					layers: 'wsguiming:' + (lyrname.split(":")[1]).split(".")[0],					
				    format: 'image/png',
				    transparent: true
				});

				// proper extent for this layer
				var extent = res.getElementsByTagName("Capability")[0].getElementsByTagName("EX_GeographicBoundingBox")[0];
				lyrlongmin = extent.getElementsByTagName("westBoundLongitude")[0].childNodes[0].nodeValue;
				lyrlongmax = extent.getElementsByTagName("eastBoundLongitude")[0].childNodes[0].nodeValue;
				lyrlatmin = extent.getElementsByTagName("southBoundLatitude")[0].childNodes[0].nodeValue;
				lyrlatmax = extent.getElementsByTagName("northBoundLatitude")[0].childNodes[0].nodeValue;	

				
				polygon = L.polygon([
					[parseFloat(latmin), parseFloat(longmin)],
					[parseFloat(latmax), parseFloat(longmin)],
					[parseFloat(latmax), parseFloat(longmax)],
					[parseFloat(latmin), parseFloat(longmax)]
				], {
					color: 'red',
					weight: 1,
					fillColor: '#f03',
					fillOpacity: 0.1
				}).addTo(map);
				
				map.fitBounds(L.latLngBounds(
					  [parseFloat(latmin), parseFloat(longmin)],
					  [parseFloat(latmax), parseFloat(longmax)]
					));

				/*var baseLayers = {
					"Grayscale": grayscale,
					"Streets": streetmap
				};

				var overlays = {
					"Data map": wmslyr
				};*/
				//
				layerControl = L.control.layers({"<br>Street map": streetmap},{"<br>Study Area": polygon, "<br>Full map": wmslyr,"<br>Masked map": maskwmslyr}).addTo(map);				
			});
							
			

			// Dates section
			if(typeof data["dates"] != 'undefined'){
				var datesH = document.createElement('h1');
				datesH.id = "dt";
				datesH.innerText = "Dates";
				ele.appendChild(datesH);
				var datesContent = document.createElement('p');	
				datesText = "";
				for(var i = 0; i < data["dates"].length; i++){
					lbl = data["dates"][i]["label"];
					if(lbl == "") {
						lbl =  data["dates"][i]["type"];
					}
					datesText = datesText + "<b>" + lbl + "</b>: " + data["dates"][i]["dateString"] + "&nbsp;&nbsp;"
				}
				datesContent.innerHTML = datesText
				ele.appendChild(datesContent);
			}

			// Citation section
			if(typeof data["citation"] != 'undefined'){
				var citationH = document.createElement('h1');
				citationH.innerText = "Citation";
				ele.appendChild(citationH);
				var citationContent = document.createElement('p');			
				citationContent.innerText = data["citation"];
				ele.appendChild(citationContent);
			}
			

			// Summary section
			if(typeof data["summary"] != 'undefined'){
				var summaryH = document.createElement('h1');
				summaryH.id = "summaryid";
				summaryH.innerText = "Summary";
				ele.appendChild(summaryH);
				var summaryContent = document.createElement('p');
				summaryContent.innerHTML = data["body"];
				ele.appendChild(summaryContent);
			}

			// Tag section	
			if(typeof data["tags"] != 'undefined'){	
				tagText = "";
				for(var i = 0; i < data["tags"].length; i++){
					if(data["tags"][i]["type"] == 'Theme'){
						tagText = tagText + data["tags"][i]["name"] + " | ";
					}
				}
				if(tagText != ""){
					var tagH = document.createElement('h1');
					tagH.innerText = "Tags";
					ele.appendChild(tagH);
					var tagContent = document.createElement('p');
					tagContent.innerHTML = tagText
					ele.appendChild(tagContent);
				}
			}

			// External link section
			var linkSB = document.createElement('a');
			linkSB.id = "externalLinkID";
			linkSB.innerHTML = "<br>Find out full details on ScienceBase.gov";
			linkSB.href = data["link"]["url"];
			linkSB.target = "_blank";
			ele.appendChild(linkSB);
		}

	}
}


function reproject_download(){

	var element = document.getElementById('ddownloadLinkID');
	if(element != null){
		element.outerHTML = "";
		delete element;;
	}
	
	outEPSG = "EPSG:" + document.getElementById('outputsrs').value;
	
	if(outEPSG == 'EPSG:same as the source'){
		outEPSG = 'EPSG:4326';
	}

	if(document.getElementById('rdownloadLinkID') != null){
		alert("Mask was done. Click the SAVE link below to download.");
		return;
	}

	// update textual tip
	var element = document.getElementById('mdbtntipid');
	if(element != null){
		element.innerHTML = "&nbsp;&nbsp;[In progress...]";;
	}

	// disable the button
	document.getElementById('mdbtn').disabled = true;
	
	var data = {data: {DownloadUrl : downloadUrl, ZipFilename: zipFilename.substring(0, zipFilename.length - 4), FileFormat: fileFormat, SEPSG: epsg, TEPSG: outEPSG, ymin: latmin, ymax: latmax, xmin: longmin, xmax: longmax, MASK: 1}};
	jQuery.ajax(
	{
		type: 'POST', 
		url: 'jsonTest.action', 
		data: JSON.stringify(data),
		dataType: 'json',
		async: true,
		contentType: 'application/json; charset=utf-8',
		success: function(){


			var ele = document.getElementById('detailsOfRec');			
			var rdownloadLink = document.createElement('a');
			rdownloadLink.id = "rdownloadLinkID";
			rdownloadLink.innerHTML = "<br>Save<br>";
			rdownloadLink.href = zipFilename;
			rdownloadLink.target = "_blank";
			//ele.insertBefore(rdownloadLink, document.getElementById('externalLinkID'));
			tmp = document.getElementById('dt');
			if(tmp == null){
				tmp = document.getElementById('summaryid');
			}
			ele.insertBefore(rdownloadLink, tmp);	
			
			// update textual tip
			var element = document.getElementById('mdbtntipid');
			if(element != null){
				element.innerHTML = "&nbsp;&nbsp;[Done]";;
			}
			
			map.removeLayer(wmslyr);
			//map.removeLayer(polygon);
			map.addLayer(maskwmslyr);
			layerControl._update();
			
			console.log('Done...');
		},
		error: function(){
			alert("something bad happened on the server ...");
		}
	});
}

function download(){
	var element = document.getElementById('rdownloadLinkID');
	if(element != null){
		element.outerHTML = "";
		delete element;
	}

	if(document.getElementById('ddownloadLinkID') != null){
		alert("Click the SAVE link below to download");
		return;
	}	

	// update textual tip
	var element = document.getElementById('dbtntipid');
	if(element != null){
		element.innerHTML = "&nbsp;&nbsp;[In progress...]";;
	}

	// reset textual tip for the other button
	/*var element = document.getElementById('mdbtntipid');
	if(element != null){
		element.innerHTML = "&nbsp;&nbsp;[A save link will show up once it is ready]";;
	}*/

	// disable the button
	document.getElementById('dbtn').disabled = true;

	outEPSG = "EPSG:" + document.getElementById('outputsrs').value;
	
	if(outEPSG == "EPSG:same as the source" || outEPSG == epsg){
		var ele = document.getElementById('detailsOfRec');			
		var ddownloadLink = document.createElement('a');
		ddownloadLink.id = "ddownloadLinkID";
		ddownloadLink.innerHTML = "Save<br>";
		ddownloadLink.href = downloadUrl
		ddownloadLink.target = "_blank";
		ele.insertBefore(ddownloadLink, document.getElementById('mdbtn'));

		var element = document.getElementById('dbtntipid');
		if(element != null){
			element.innerHTML = "&nbsp;&nbsp;[Done]";;
		}

		map.removeLayer(maskwmslyr);
		map.addLayer(wmslyr);
		layerControl._update();
	}

	else{
		var data = {data: {DownloadUrl : downloadUrl, ZipFilename: zipFilename.substring(0, zipFilename.length - 4), FileFormat: fileFormat, SEPSG: epsg, TEPSG: outEPSG, ymin: lyrlatmin, ymax: lyrlatmax, xmin: lyrlongmin, xmax: lyrlongmax, MASK: 0}};
		jQuery.ajax(
		{
			type: 'POST', 
			url: 'jsonTest.action', 
			data: JSON.stringify(data),
			dataType: 'json',
			async: true,
			contentType: 'application/json; charset=utf-8',
			success: function(){
				
				var ele = document.getElementById('detailsOfRec');			
				var ddownloadLink = document.createElement('a');
				ddownloadLink.id = "ddownloadLinkID";
				ddownloadLink.innerHTML = "Save<br>";
				ddownloadLink.href = zipFilename;
				ddownloadLink.target = "_blank";
				ele.insertBefore(ddownloadLink, document.getElementById('mdbtn'));	

				var element = document.getElementById('dbtntipid');
				if(element != null){
					element.innerHTML = "&nbsp;&nbsp;[Done]";;
				}
				
				map.removeLayer(maskwmslyr);
				map.addLayer(wmslyr);
				layerControl._update();
				
				console.log('Done...');
			},
			error: function(){
				alert("something bad happened on the server ...");
			}
		});
	}
}

