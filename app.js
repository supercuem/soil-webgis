"use strict";

// QCVN 03:2023/BTNMT, Table 1, mg/kg; order: land categories 1, 2, 3.
// https://cem.gov.vn/storage/documents/642f930305509qcvn-032023btnmt.pdf
const LIMITS = Object.freeze({
  as: Object.freeze([25, 50, 200]),
  cd: Object.freeze([4, 10, 60]),
  zn: Object.freeze([300, 600, 2000]),
  pb: Object.freeze([200, 400, 700]),
  cu: Object.freeze([150, 500, 2000]),
  hg: Object.freeze([12, 30, 60]),
});
function assessIndicator(code, reading, landCategory) {
  if (!["1", "2", "3"].includes(String(landCategory))) throw new RangeError("Unknown land category");
  const thresholds = LIMITS[code];
  if (!thresholds) return {code, status: "no_limit", limit: null, ratio: null};
  const limit = thresholds[Number(landCategory) - 1];
  if (!reading || reading.quality_flag !== "valid" || !Number.isFinite(reading.value)) return {code, status: "indeterminate", limit, ratio: null};
  return {code, status: reading.value > limit ? "exceed" : "within", limit, ratio: reading.value / limit};
}
function assessSample(sample, landCategory) {
  if (!sample) return {status: "no_sample", results: [], exceeding: [], compared: 0, indeterminate: 0};
  const results = Object.keys(LIMITS).map(code => assessIndicator(code, sample.measurements?.[code], landCategory));
  const exceeding = results.filter(result => result.status === "exceed");
  const compared = results.filter(result => result.status === "exceed" || result.status === "within").length;
  const indeterminate = results.filter(result => result.status === "indeterminate").length;
  return {status: exceeding.length ? "exceed" : compared ? "within_observed" : "indeterminate", results, exceeding, compared, indeterminate};
}

// This public preview contains fabricated examples only; research data stays private.
function nextVisibleLayers(current,mode){
  if(!["cadastre","soil"].includes(mode))throw new RangeError("Unknown overlay");
  return {...current,[mode]:!current[mode]};
}
const state={data:null,map:null,markers:null,visibleLayers:{soil:false,cadastre:false},layers:{soil:null,cadastre:null},loading:{soil:null,cadastre:null},metric:"ph",depth:"0-30",landCategory:"1",district:"all",query:"",showPoints:true,selected:null,location:null};
const $=id=>document.getElementById(id);
const number=new Intl.NumberFormat("vi-VN",{maximumFractionDigits:5});
const indicator=()=>state.data?.indicators.find(item=>item.code===state.metric);
const sampleAt=(site,depth=state.depth)=>site.samples.find(item=>item.depth_cm===depth);
const readingAt=(site,metric=state.metric)=>sampleAt(site)?.measurements[metric]??null;
function formatReading(reading,unit=""){
  if(!reading)return "—";
  if(reading.quality_flag==="below_detection")return "KPH";
  return `${number.format(reading.value)}${unit&&unit!=="pH"?` ${unit}`:""}`;
}
function filteredSites(){
  if(!state.data)return [];
  const q=state.query.trim().toLocaleLowerCase("vi");
  return state.data.sites.filter(site=>(state.district==="all"||site.district===state.district)&&(!q||`${site.code} ${site.district}`.toLocaleLowerCase("vi").includes(q)));
}
function numericValues(sites){return sites.map(site=>readingAt(site)).filter(r=>r&&r.quality_flag==="valid"&&Number.isFinite(r.value)).map(r=>r.value);}
function scaleFor(sites){const values=numericValues(sites);return values.length?{min:Math.min(...values),max:Math.max(...values)}:null;}
function colorFor(site,scale){
  const r=readingAt(site);
  if(!r||r.value===null||!scale)return "#9aa9a2";
  const t=scale.max===scale.min?.5:(r.value-scale.min)/(scale.max-scale.min);
  return t<.34?"#d9ad62":t<.67?"#a1c36d":"#3f8b70";
}
function toast(message){const el=$("map-toast");el.textContent=message;el.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.hidden=true,4000);}
function renderLegend(){
  const el=$("legend");el.replaceChildren();
  const title=document.createElement("div");title.className="legend-title";title.textContent=`${indicator()?.name??"Chỉ tiêu"} · ${indicator()?.unit??""}`;
  const bar=document.createElement("div");bar.className="legend-scale";
  const labels=document.createElement("div");labels.className="legend-numbers";
  const scale=scaleFor(filteredSites());
  (scale?[scale.min,(scale.min+scale.max)/2,scale.max]:[null,null,null]).forEach(v=>{const span=document.createElement("span");span.textContent=v===null?"—":number.format(v);labels.append(span);});
  const note=document.createElement("div");note.className="legend-note";note.textContent=`Giá trị tương đối · tầng ${state.depth} cm · không phải mức cảnh báo`;
  el.append(title,bar,labels,note);
  if(state.visibleLayers.soil||state.visibleLayers.cadastre){
    const mapNote=document.createElement("div");mapNote.className="legend-map-note";
    mapNote.textContent=[state.visibleLayers.soil?"Mảng màu: nhóm đất giả lập":null,state.visibleLayers.cadastre?"Đường viền nâu: ranh thửa giả lập":null].filter(Boolean).join(" · ");
    el.append(mapNote);
  }
}
function renderStats(){
  const sites=filteredSites(),readings=sites.map(site=>readingAt(site)),values=numericValues(sites),kph=readings.filter(r=>r?.quality_flag==="below_detection").length;
  const stats=[["Điểm giả lập",sites.length],["Có số đo",values.length],["Trung bình",values.length?number.format(values.reduce((a,b)=>a+b,0)/values.length):"—"],["KPH",kph]];
  const el=$("stats");el.replaceChildren();
  stats.forEach(([label,value])=>{const card=document.createElement("div"),small=document.createElement("small"),strong=document.createElement("strong");card.className="stat-card";small.textContent=label;strong.textContent=String(value);card.append(small,strong);el.append(card);});
  $("export-csv").disabled=!sites.length;
}
function renderList(){
  const sites=filteredSites(),el=$("sample-list"),scale=scaleFor(sites);$("result-count").textContent=String(sites.length);el.replaceChildren();
  if(!sites.length){const empty=document.createElement("p");empty.className="empty-state";empty.textContent=state.data?"Không có điểm phù hợp với bộ lọc.":"Đang tải dữ liệu minh họa…";el.append(empty);return;}
  sites.forEach(site=>{
    const button=document.createElement("button"),dot=document.createElement("span"),body=document.createElement("span"),name=document.createElement("strong"),sub=document.createElement("small"),value=document.createElement("span");
    button.type="button";button.className=`sample-item${state.selected===site.code?" selected":""}`;button.setAttribute("aria-label",`Mở ${site.code}, ${site.district}`);
    dot.className="sample-dot";dot.style.backgroundColor=colorFor(site,scale);body.className="sample-item-body";name.textContent=site.code;sub.textContent=`${site.district} · ${state.depth} cm`;body.append(name,sub);
    value.className=`sample-value${readingAt(site)?.value===null?" missing":""}`;value.textContent=formatReading(readingAt(site),indicator()?.unit);
    button.append(dot,body,value);button.addEventListener("click",()=>selectSite(site,true));el.append(button);
  });
}
function renderMarkers(){
  if(!state.map||!state.markers)return;
  state.markers.clearLayers();if(!state.showPoints)return;
  const sites=filteredSites(),scale=scaleFor(sites);
  sites.forEach(site=>{const marker=L.circleMarker([site.latitude,site.longitude],{pane:"samplePane",radius:state.selected===site.code?11:8,color:"#fff",weight:2.5,fillColor:colorFor(site,scale),fillOpacity:.95,bubblingMouseEvents:false});marker.bindTooltip(`${site.code} · ${formatReading(readingAt(site),indicator()?.unit)}`);marker.on("click",()=>selectSite(site,false));state.markers.addLayer(marker);});
}
function renderAll(){renderLegend();renderStats();renderList();renderMarkers();}
function warningPanel(site){
  const panel=document.createElement("section"),heading=document.createElement("div"),title=document.createElement("strong"),category=document.createElement("small"),picker=document.createElement("label"),pickerText=document.createElement("span"),pickerSelect=document.createElement("select"),summary=document.createElement("p"),metricNote=document.createElement("p"),rows=document.createElement("div"),source=document.createElement("a");
  const sample=sampleAt(site),assessment=assessSample(sample,state.landCategory),selected=assessIndicator(state.metric,readingAt(site),state.landCategory);
  panel.className=`warning-panel ${assessment.status}`;heading.className="warning-heading";title.textContent="Cảnh báo minh họa";category.textContent=`QCVN 03:2023 · Loại ${state.landCategory}`;heading.append(title,category);
  picker.className="warning-picker";pickerText.textContent="Loại đất để so sánh";[["1","Loại 1 · nông nghiệp, đất ở…"],["2","Loại 2 · rừng, thương mại…"],["3","Loại 3 · công nghiệp, giao thông…"]].forEach(([optionValue,optionLabel])=>{const option=document.createElement("option");option.value=optionValue;option.textContent=optionLabel;pickerSelect.append(option);});pickerSelect.value=state.landCategory;pickerSelect.addEventListener("change",event=>{state.landCategory=event.target.value;$("land-category").value=state.landCategory;refreshSelectedDetail();});picker.append(pickerText,pickerSelect);
  summary.className="warning-summary";
  if(assessment.status==="exceed")summary.textContent=`Vượt ngưỡng ${assessment.exceeding.length} chỉ tiêu: ${assessment.exceeding.map(item=>item.code.toUpperCase()).join(", ")}.`;
  else if(assessment.status==="within_observed")summary.textContent=`Chưa thấy vượt ngưỡng trong ${assessment.compared} chỉ tiêu kim loại có số đo${assessment.indeterminate?`; ${assessment.indeterminate} chỉ tiêu chưa xác định`:""}.`;
  else summary.textContent="Chưa đủ số đo để so sánh ngưỡng kim loại.";
  metricNote.className="warning-metric";
  if(selected.status==="no_limit")metricNote.textContent=`${indicator()?.name??state.metric}: quy chuẩn này không có ngưỡng cho chỉ tiêu đã chọn.`;
  else if(selected.status==="indeterminate")metricNote.textContent=`${indicator()?.name??state.metric}: chưa thể đánh giá (KPH hoặc thiếu số đo/giới hạn phát hiện).`;
  else metricNote.textContent=`${indicator()?.name??state.metric}: ${selected.status==="exceed"?"vượt":"không vượt"} ngưỡng ${number.format(selected.limit)} mg/kg${selected.status==="exceed"?` (${number.format(selected.ratio)} lần)`:""}.`;
  rows.className="warning-rows";
  assessment.results.forEach(result=>{const row=document.createElement("div"),name=document.createElement("span"),reading=document.createElement("span"),limit=document.createElement("span"),status=document.createElement("strong");row.className=`warning-row ${result.status}`;name.textContent=result.code.toUpperCase();reading.textContent=formatReading(readingAt(site,result.code),"mg/kg");limit.textContent=`/ ${number.format(result.limit)} mg/kg`;status.textContent=result.status==="exceed"?"Vượt":result.status==="within"?"Không vượt":"Chưa rõ";row.append(name,reading,limit,status);rows.append(row);});
  source.href="https://cem.gov.vn/storage/documents/642f930305509qcvn-032023btnmt.pdf";source.target="_blank";source.rel="noopener";source.textContent="Xem QCVN 03:2023/BTNMT ↗";
  const caveat=document.createElement("p");caveat.className="warning-caveat";caveat.textContent="Số đo và vị trí hoàn toàn giả lập. Phần này chỉ giới thiệu cách cảnh báo hoạt động, không đánh giá đất thật.";
  panel.append(heading,picker,summary,metricNote,rows,source,caveat);return panel;
}
function selectSite(site,pan){
  state.selected=site.code;renderList();renderMarkers();if(pan&&state.map)state.map.flyTo([site.latitude,site.longitude],Math.max(state.map.getZoom(),12),{duration:.7});
  const detail=$("sample-detail"),content=document.createElement("div"),eyebrow=document.createElement("div"),title=document.createElement("h2"),subtitle=document.createElement("p"),score=document.createElement("div"),label=document.createElement("span"),value=document.createElement("strong"),grid=document.createElement("div"),foot=document.createElement("p");
  content.className="detail-content";eyebrow.className="detail-eyebrow";eyebrow.textContent="HỒ SƠ MINH HỌA · DỮ LIỆU GIẢ LẬP";title.id="detail-title";title.textContent=site.code;subtitle.className="detail-subtitle";subtitle.textContent=`${site.district}, ${site.province} · tầng ${state.depth} cm`;
  score.className="detail-score";label.textContent=indicator()?.name??"Chỉ tiêu";value.textContent=formatReading(readingAt(site),indicator()?.unit);score.append(label,value);
  grid.className="detail-measurements";state.data.indicators.forEach(item=>{const cell=document.createElement("div"),small=document.createElement("small"),strong=document.createElement("strong");cell.className="detail-measurement";small.textContent=item.name;strong.textContent=formatReading(readingAt(site,item.code),item.unit);cell.append(small,strong);grid.append(cell);});
  foot.className="detail-foot";foot.textContent=`Tọa độ minh họa ${site.latitude.toFixed(5)}, ${site.longitude.toFixed(5)}; không phải vị trí lấy mẫu thật. KPH trong bản demo chỉ để thử giao diện.`;
  content.append(eyebrow,title,subtitle,score,warningPanel(site),grid,foot);detail.replaceChildren(content);if(!$("sample-dialog").open)$("sample-dialog").showModal();
}
function refreshSelectedDetail(){if(!$("sample-dialog").open||!state.selected)return;const site=state.data?.sites.find(item=>item.code===state.selected);if(site)selectSite(site,false);}
function fitSites(){if(!state.map)return;const sites=filteredSites();if(!sites.length){toast("Không có điểm mẫu để phóng tới.");return;}state.map.fitBounds(L.latLngBounds(sites.map(site=>[site.latitude,site.longitude])).pad(.2),{maxZoom:12});}
function soilStyle(feature){const group=Number((feature.properties.symbol||"").split("-").at(-1))||1;const colors=["#8baa6d","#c39068","#b6aa79"];return{pane:"soilPane",color:"#526b58",weight:1,opacity:.8,fillColor:colors[(group-1)%colors.length],fillOpacity:.55,bubblingMouseEvents:false};}
function cadastreStyle(){return{pane:"cadastrePane",color:"#8b613f",weight:1.5,opacity:.95,fillColor:"#f4e7c7",fillOpacity:.08,bubblingMouseEvents:false};}
function bindMapPopup(feature,layer,mode){
  const popup=document.createElement("div"),strong=document.createElement("strong"),small=document.createElement("small");popup.className="soil-popup";
  if(mode==="soil"){
    strong.textContent=feature.properties.name||"Nhóm đất minh họa";
    small.textContent=`${feature.properties.code} · vùng đất giả lập, không phải bản đồ thổ nhưỡng thật`;
  }else{
    strong.textContent=`Tờ ${feature.properties.sheet} · thửa ${feature.properties.parcel}`;
    small.textContent="Ranh thửa giả lập, không thuộc hồ sơ địa chính thật";
  }
  popup.append(strong,small);layer.bindPopup(popup);
}
async function loadOverlayLayer(mode){
  if(state.layers[mode])return state.layers[mode];
  if(state.loading[mode])return state.loading[mode];
  const file=mode==="soil"?"soil-polygons.geojson":"parcel-polygons.geojson";
  state.loading[mode]=(async()=>{
    const response=await fetch(`data/processed/${file}`);
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const geojson=await response.json();
    if(geojson.metadata?.source_file!=="SYNTHETIC_DEMO_ONLY"||!Array.isArray(geojson.features))throw new Error("Not synthetic demo data");
    const layer=L.geoJSON(geojson,{pane:mode==="soil"?"soilPane":"cadastrePane",style:mode==="soil"?soilStyle:cadastreStyle,bubblingMouseEvents:false,onEachFeature:(feature,shape)=>bindMapPopup(feature,shape,mode)});
    state.layers[mode]=layer;
    return layer;
  })().finally(()=>{state.loading[mode]=null;});
  return state.loading[mode];
}
function updateOverlayButtons(){
  document.querySelectorAll(".basemap-button[data-overlay]").forEach(button=>{
    const active=state.visibleLayers[button.dataset.overlay];
    button.classList.toggle("active",active);button.setAttribute("aria-pressed",String(active));
  });
  renderLegend();
}
async function toggleOverlay(mode){
  if(!state.map||!["cadastre","soil"].includes(mode))return;
  state.visibleLayers=nextVisibleLayers(state.visibleLayers,mode);updateOverlayButtons();
  if(!state.visibleLayers[mode]){
    if(state.layers[mode])state.map.removeLayer(state.layers[mode]);
    return;
  }
  toast(mode==="cadastre"?"Đang tải ranh thửa minh họa…":"Đang tải nhóm đất minh họa…");
  try{
    const layer=await loadOverlayLayer(mode);
    if(!state.visibleLayers[mode])return;
    layer.addTo(state.map);
    if(mode==="cadastre"&&state.map.getZoom()<13&&state.data?.sites.length){
      const center=state.map.getCenter();
      const nearest=state.data.sites.reduce((best,site)=>{
        const distance=(site.latitude-center.lat)**2+(site.longitude-center.lng)**2;
        return !best||distance<best.distance?{site,distance}:best;
      },null).site;
      state.map.flyTo([nearest.latitude,nearest.longitude],13,{duration:.6});
    }
    toast(mode==="cadastre"?"Đã hiển thị ranh thửa giả lập.":"Đã hiển thị vùng thổ nhưỡng giả lập.");
  }catch{
    if(!state.visibleLayers[mode])return;
    state.visibleLayers[mode]=false;updateOverlayButtons();toast("Không tải được lớp minh họa. Bản đồ đường phố vẫn hiển thị.");
  }
}
function initMap(){if(typeof L==="undefined"){$("map-error").hidden=false;return;}state.map=L.map("map",{zoomControl:false,preferCanvas:false}).setView([10.95,107.05],10);[["soilPane",380],["cadastrePane",390],["samplePane",430]].forEach(([name,zIndex])=>{state.map.createPane(name);state.map.getPane(name).style.zIndex=zIndex;});L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'}).addTo(state.map);state.markers=L.layerGroup().addTo(state.map);state.map.on("click",event=>{$("coordinate-chip").textContent=`Tọa độ: ${event.latlng.lat.toFixed(5)}, ${event.latlng.lng.toFixed(5)} · Chưa có mẫu gắn tại vị trí này`;toast("Chưa có số đo tại tọa độ này. Bấm một điểm mẫu để xem mức đo và cảnh báo.");});}
function csvCell(value){const plain=value==null?"":String(value),safe=typeof value==="string"&&/^[=+@\-\t\r]/.test(plain)?`'${plain}`:plain;return `"${safe.replaceAll('"','""')}"`;}
function exportCsv(){
  if(!state.data)return;const headers=["DU_LIEU_GIA_LAP","ma_diem","huyen","tinh","do_sau_cm","vi_do_minh_hoa","kinh_do_minh_hoa",...state.data.indicators.map(item=>`${item.code}_${item.unit}`)];
  const rows=filteredSites().map(site=>["DEMO",site.code,site.district,site.province,state.depth,site.latitude,site.longitude,...state.data.indicators.map(item=>{const r=readingAt(site,item.code);return r?.quality_flag==="below_detection"?"KPH":r?.value??"";})]);
  const csv="\uFEFF"+[headers,...rows].map(row=>row.map(csvCell).join(",")).join("\r\n"),url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"})),link=document.createElement("a");link.href=url;link.download=`soil-webgis-DEMO-${state.depth}cm.csv`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function initControls(){
  $("sample-search").addEventListener("input",event=>{state.query=event.target.value;state.selected=null;renderAll();});
  $("area-select").addEventListener("change",event=>{state.district=event.target.value;state.selected=null;renderAll();fitSites();});
  $("depth-select").addEventListener("change",event=>{state.depth=event.target.value;renderAll();refreshSelectedDetail();});
  $("metric-select").addEventListener("change",event=>{state.metric=event.target.value;renderAll();refreshSelectedDetail();});
  $("land-category").addEventListener("change",event=>{state.landCategory=event.target.value;refreshSelectedDetail();});
  $("show-points").addEventListener("change",event=>{state.showPoints=event.target.checked;renderMarkers();});
  document.querySelectorAll(".basemap-button[data-overlay]").forEach(button=>button.addEventListener("click",()=>toggleOverlay(button.dataset.overlay)));
  $("export-csv").addEventListener("click",exportCsv);$("zoom-in").addEventListener("click",()=>state.map?.zoomIn());$("zoom-out").addEventListener("click",()=>state.map?.zoomOut());$("fit-points").addEventListener("click",fitSites);
  $("locate-me").addEventListener("click",()=>{if(!state.map||!navigator.geolocation){toast("Trình duyệt không hỗ trợ định vị.");return;}navigator.geolocation.getCurrentPosition(({coords})=>{if(state.location)state.map.removeLayer(state.location);state.location=L.circleMarker([coords.latitude,coords.longitude],{pane:"samplePane",radius:8,color:"#fff",weight:3,fillColor:"#268bd2",fillOpacity:1}).addTo(state.map);state.map.setView([coords.latitude,coords.longitude],13);$("coordinate-chip").textContent=`Vị trí của bạn: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;},()=>toast("Không lấy được vị trí."),{enableHighAccuracy:false,timeout:10000});});
  $("close-detail").addEventListener("click",()=>$("sample-dialog").close());$("sample-dialog").addEventListener("close",()=>{state.selected=null;renderList();renderMarkers();});
}
async function loadSurvey(){
  try{const response=await fetch("data/processed/survey.json");if(!response.ok)throw new Error(`HTTP ${response.status}`);const data=await response.json();if(!Array.isArray(data.sites)||data.sites.length!==data.metadata.site_count)throw new Error("Invalid survey data");state.data=data;
    const districts=[...new Set(data.sites.map(site=>site.district))].sort((a,b)=>a.localeCompare(b,"vi"));districts.forEach(district=>{const option=document.createElement("option");option.value=district;option.textContent=district;$("area-select").append(option);});
    $("metric-select").replaceChildren();data.indicators.forEach(item=>{const option=document.createElement("option");option.value=item.code;option.textContent=`${item.name} · ${item.unit}`;$("metric-select").append(option);});$("metric-select").value=state.metric;
    $("map-caption-sub").textContent=`${data.metadata.site_count} điểm giả lập · ${districts.length} địa bàn`;renderAll();fitSites();toast(`Đã nạp ${data.metadata.site_count} điểm minh họa.`);
  }catch{const message=document.createElement("p");message.className="empty-state";message.textContent="Không tải được dữ liệu khảo sát. Hãy kiểm tra kết nối rồi tải lại trang.";$("sample-list").replaceChildren(message);$("map-caption-sub").textContent="Chưa tải được dữ liệu";toast("Dữ liệu chưa tải được; không hiển thị điểm giả.");}
}
if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded",()=>{initControls();initMap();renderAll();loadSurvey();});
if (typeof module !== "undefined" && module.exports) module.exports = {LIMITS, assessIndicator, assessSample, nextVisibleLayers};
