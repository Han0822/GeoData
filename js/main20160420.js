/* global variables */
var fileFormat = "Raster";
var epsg = "EPSG:4326";
var outEPSG = "EPSG:XXXX";
var downloadUrl = "";
var zipFilename = "";

var latmin;
var latmax;
var longmin;
var longmax;
var wmslyr;
var lyrname;
var maskwmslyr;
var map;
var layerControl;
var polygon;

/**
  perform search in ScienceBase
*/
function search(){
	
	// topical keywords
	keywords = document.getElementById('keyword').value;
	
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
}

/**
  what happens when clicking each individual item in the list (top 5 of the search results)
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
			var titleH = document.createElement('h2');
			titleH.innerText = data["title"];
			ele.appendChild(titleH);

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
				maskwmsurl = "http://localhost:8080/geoserver/wsguiming/wms"; // test only				
				maskwmslyr = L.tileLayer.wms(maskwmsurl, {
					layers: 'wsguiming:' + lyrname.split(":")[1],					
				    format: 'image/png',
				    transparent: true
				});

				// proper extent for this layer
				var extent = res.getElementsByTagName("Capability")[0].getElementsByTagName("EX_GeographicBoundingBox")[0];
				var minX = extent.getElementsByTagName("westBoundLongitude")[0].childNodes[0].nodeValue;
				var maxX = extent.getElementsByTagName("eastBoundLongitude")[0].childNodes[0].nodeValue;
				var minY = extent.getElementsByTagName("southBoundLatitude")[0].childNodes[0].nodeValue;
				var maxY = extent.getElementsByTagName("northBoundLatitude")[0].childNodes[0].nodeValue;	

				
				polygon = L.polygon([
					[parseFloat(latmin), parseFloat(longmin)],
					[parseFloat(latmax), parseFloat(longmin)],
					[parseFloat(latmax), parseFloat(longmax)],
					[parseFloat(latmin), parseFloat(longmax)]
				], {
					color: 'red',
					fillColor: '#f03',
					fillOpacity: 0.1
				}).addTo(map);
				
				map.fitBounds(L.latLngBounds(
					  //L.latLng(minY, minX),
					  //L.latLng(maxY, maxX)
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
				layerControl = L.control.layers({"Grayscale":grayscale, "Street map": streetmap},{"Study Area": polygon, "Full map": wmslyr,"Masked map": maskwmslyr}).addTo(map);				
			});
							
			

			// Dates section
			if(typeof data["dates"] != 'undefined'){
				var datesH = document.createElement('h1');
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

			// Download section
			if(typeof data["facets"] != 'undefined'){
				var downloadH = document.createElement('h1');
				downloadH.innerText = "Download";
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
				metaContent.innerHTML = "This dataset is in <b>" + fileFormat + "</b> format. Spatial reference system (SRS) <b>" + epsg + "</b>.";
				ele.appendChild(metaContent);

				// direct download
				///*
				var inputP = document.createElement('p');
				inputP.innerHTML = "If no reprojection is needed, it will be masked by the spatial extent you speciefied.";
				ele.appendChild(inputP);
				
				if(typeof data["distributionLinks"] != 'undefined'){
					for (var i = 0; i < data["distributionLinks"].length; i++) {
						if(data["distributionLinks"][i]["type"] == "downloadLink"){
							downloadUrl = data["distributionLinks"][i]["uri"];
							zipFilename = data["distributionLinks"][i]["name"];
						}
					}				
				}
				
				var dbutton = document.createElement('button');
				dbutton.style = "display:inline-block";
				dbutton.innerHTML = "Download";
				dbutton.onclick = download;
				ele.appendChild(dbutton);				
				
				var tip = document.createElement('p');
				tip.innerText = "(A download link will show up once mask is done)";
				ele.appendChild(tip);
				//*/
				
				/*
				var downloadLink = document.createElement('a');
				downloadLink.innerHTML = "Download<br>";
				downloadLink.href = data["link"]["url"];
				if(typeof data["distributionLinks"] != 'undefined'){
					for (var i = 0; i < data["distributionLinks"].length; i++) {
						if(data["distributionLinks"][i]["type"] == "downloadLink"){
							downloadUrl = data["distributionLinks"][i]["uri"];
							zipFilename = data["distributionLinks"][i]["name"];
							downloadLink.href = downloadUrl;
						}
					}				
				}
				downloadLink.target = "_blank";
				ele.appendChild(downloadLink);
				*/

				// reproject and download
				var inputP = document.createElement('p');
				inputP.id = "docreproj";
				inputP.innerHTML = "Or reproject to another SRS:<input id='outputsrs' value='EPSG:4326'>" 
				                   + "&nbsp; <a href='http://spatialreference.org/ref/epsg/' target='_blank'>Find EPSG code for SRS</a>";
				ele.appendChild(inputP);

				var rbutton = document.createElement('button');
				rbutton.style = "display:inline-block";
				rbutton.innerHTML = "Mask and Download";
				rbutton.onclick = reproject_download;
				ele.appendChild(rbutton);

				var tip = document.createElement('p');

				tip.innerText = "(A download link will show up once reprojection is done)";
				ele.appendChild(tip);
				
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
	
	outEPSG = document.getElementById('outputsrs').value;
	
	//if(epsg == outEPSG){
	//	alert("SRS is the same. No need to reproject.");
	//	return;
	//}

	if(document.getElementById('rdownloadLinkID') != null){
		alert("Reproject & mask was done. No need to reproject & mask again.");
		return;
	}
	
	var data = {data: {DownloadUrl : downloadUrl, ZipFilename: zipFilename.substring(0, zipFilename.length - 4), FileFormat: fileFormat, SEPSG: epsg, TEPSG: outEPSG, ymin: latmin, ymax: latmax, xmin: longmin, xmax: longmax}};
	jQuery.ajax(
	{
		type: 'POST', 
		url: 'jsonTest.action', 
		data: JSON.stringify(data),
		dataType: 'json',
		async: false ,
		contentType: 'application/json; charset=utf-8',
		success: function(){
			
			var ele = document.getElementById('detailsOfRec');			
			var rdownloadLink = document.createElement('a');
			rdownloadLink.id = "rdownloadLinkID";
			rdownloadLink.innerHTML = "Download<br>";
			rdownloadLink.href = zipFilename;
			rdownloadLink.target = "_blank";
			ele.insertBefore(rdownloadLink, document.getElementById('externalLinkID'));	
			
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
	
	//outEPSG = "EPSG:4326";
	outEPSG = epsg;

	if(document.getElementById('ddownloadLinkID') != null){
		alert("Mask was done. No need to mask again.");
		return;
	}
	
	var data = {data: {DownloadUrl : downloadUrl, ZipFilename: zipFilename.substring(0, zipFilename.length - 4), FileFormat: fileFormat, SEPSG: epsg, TEPSG: outEPSG, ymin: latmin, ymax: latmax, xmin: longmin, xmax: longmax}};
	jQuery.ajax(
	{
		type: 'POST', 
		url: 'jsonTest.action', 
		data: JSON.stringify(data),
		dataType: 'json',
		async: false ,
		contentType: 'application/json; charset=utf-8',
		success: function(){
			
			var ele = document.getElementById('detailsOfRec');			
			var ddownloadLink = document.createElement('a');
			ddownloadLink.id = "ddownloadLinkID";
			ddownloadLink.innerHTML = "Download<br>";
			ddownloadLink.href = zipFilename;
			ddownloadLink.target = "_blank";
			ele.insertBefore(ddownloadLink, document.getElementById('docreproj'));	
			
			map.removeLayer(wmslyr);
			//map.removeLayer(polygon);
			map.addLayer(maskwmslyr);
			layerControl._update();
			
			console.log('Done...');
		},
		error: function(){
			alert("something was wrong on the server ...");
		}
	});
}

