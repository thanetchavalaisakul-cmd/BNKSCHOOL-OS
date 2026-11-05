
  function createAcademicCertificateRegistryFeature({supabase,state,escapeHtml,ensureXlsx,downloadBlob,toast,renderDashboard}) {
    const HEADERS = ["เลขเกียรติบัตร","คำนำหน้า ชื่อสกุล","ชั้น","รายการ","หมายเหตุ"];
    const TEMPLATE_SHEET = "บัญชีคุมเกียรติบัตร";
    const META_SHEET = "ข้อมูลแบบฟอร์ม";
    let academicYear = Number(state?.academicTerms?.[0]?.academic_year || new Date().getFullYear()+543);
    if (!Number.isInteger(academicYear) || academicYear<2500 || academicYear>2700) academicYear=2569;
    let reservationCount=50, records=[], stats=null, myReservations=[], fetchError="",searchText="",template=null,pending=null,lastNotice="";
    const text = x=>String(x??"").trim();
    const safe=x=>escapeHtml(String(x??""));
    const formatNum=(n,year=academicYear)=>`${n}/${year}`;
    function visibleRecords(){
      const term=searchText.toLocaleLowerCase("th");
      return term?records.filter(r=>[`${r.serial_no}/${r.academic_year}`,r.recipient_name,r.grade_level,r.activity,r.note].some(v=>String(v||"").toLocaleLowerCase("th").includes(term))):records;
    }
    async function load(){
      fetchError="";
      try{
        const result=[];
        for(let offset=0;offset<100000;offset+=1000){
          const {data,error}=await supabase.from("academic_certificate_registry")
            .select("id,academic_year,serial_no,recipient_name,grade_level,activity,note,created_at")
            .eq("academic_year",academicYear).order("serial_no",{ascending:true}).range(offset,offset+999);
          if(error)throw error;
          result.push(...(data||[]));
          if((data||[]).length<1000)break;
        }
        records=result;
        const [info,mine]=await Promise.all([
          supabase.rpc("get_academic_certificate_reservation_stats",{p_year:academicYear}),
          supabase.rpc("get_academic_certificate_my_reservations",{p_year:academicYear})
        ]);
        if(info.error)throw info.error;
        if(mine.error)throw mine.error;
        if(!Number.isInteger(Number(info.data?.next_available)))throw new Error("เลขคุมถัดไปไม่ถูกต้อง");
        stats=info.data;
        myReservations=Array.isArray(mine.data)?mine.data:[];
      }catch(error){
        stats=null;myReservations=[];fetchError=error?.message||String(error);
      }
    }
    function renderRows(rows=visibleRecords()){
      if(!rows.length)return '<tr><td colspan="5" style="text-align:center;padding:24px">ไม่พบรายการเลขคุมเกียรติบัตรในปีการศึกษานี้</td></tr>';
      return rows.map(r=>`<tr>
        <td><strong>${safe(r.serial_no)}/${safe(r.academic_year)}</strong></td>
        <td>${safe(r.recipient_name)}</td>
        <td>${safe(r.grade_level)}</td>
        <td>${safe(r.activity)}</td>
        <td>${safe(r.note||"—")}</td>
      </tr>`).join("");
    }
    function view(){
      const matches=visibleRecords(),last=Number(stats?.last_recorded||0),next=Number(stats?.next_available||1);
      const pendingCount=pending?.rows?.length||0;
      const canReserve=stats?.reservation_enabled===true;
      return '<section class="panel cert-ledger">'+
        '<div class="panel-head"><div class="panel-title-wrap"><h3>ทะเบียนเลขคุมเกียรติบัตรประจำปีการศึกษา</h3>'+
        '<p>เลขคุมแยกปีการศึกษา · เลือกจำนวนก่อนดาวน์โหลด · ระบบจองเลขในฐานข้อมูลเพื่อป้องกันเลขซ้ำ</p></div></div>'+
        '<div class="cert-toolbar"><label class="cert-year-field">ปีการศึกษา '+
        '<input class="input" id="cert-ledger-year" type="number" min="2500" max="2700" step="1" value="'+academicYear+'"></label>'+
        '<button class="btn btn-secondary" type="button" id="cert-ledger-change-year">แสดงข้อมูลปีนี้</button>'+
        '<button class="btn btn-secondary" type="button" id="cert-ledger-export" '+(records.length?'':'disabled')+'>ส่งออก Excel</button></div>'+
        '<div class="cert-stats">'+
        '<div><span>ปีการศึกษา</span><strong>'+academicYear+'</strong></div>'+
        '<div><span>รายการที่บันทึก</span><strong>'+records.length.toLocaleString("th-TH")+'</strong></div>'+
        '<div><span>เลขคุมล่าสุดที่บันทึก</span><strong>'+(last?formatNum(last):'ยังไม่มี')+'</strong></div>'+
        '<div><span>เลขถัดไปที่จองได้</span><strong>'+(stats?formatNum(next):'—')+'</strong></div></div>'+
        (stats&&!canReserve?'<div class="cert-warning" role="alert"><strong>ยังไม่เปิดจองเลขคุมปี '+academicYear+
           '</strong><p>'+safe(stats.reservation_reason||'อยู่ระหว่างตรวจสอบทะเบียนเดิม')+'</p></div>':'')+
        (stats&&Number(stats.unsubmitted_reservations)>0?'<div class="cert-notice">มีการจองเลขที่ยังไม่นำเข้า '+
           safe(stats.unsubmitted_reservations)+' ชุด (เลขเหล่านี้จะไม่ถูกจองซ้ำ)</div>':'')+
        '<div class="cert-upload-flow"><div class="cert-flow-card"><strong>1. เลือกจำนวนและดาวน์โหลดแบบฟอร์ม</strong>'+
        '<p>เลือกจำนวนที่ต้องการ เช่น 50 ใบ ระบบจองเลขให้ 50 เลขทันที</p>'+
        '<label>จำนวนเกียรติบัตร (1–500 ใบ) <input class="input" id="cert-ledger-reserve-count" type="number" min="1" max="500" step="1" value="'+reservationCount+'"></label>'+
        '<button class="btn btn-primary" type="button" id="cert-ledger-download" '+(canReserve?'':'disabled')+'>จองเลขและดาวน์โหลด Excel</button></div>'+
        '<div class="cert-flow-card"><strong>2. กรอกข้อมูลและนำเข้า</strong>'+
        '<p>กรอกชื่อ ชั้น และรายการให้ครบตามจำนวนเลขที่จอง แล้วเลือกไฟล์ Excel เดิมที่ดาวน์โหลดไว้</p>'+
        '<input type="file" accept=".xlsx,.xls" id="cert-ledger-file" aria-label="เลือก Excel เพื่อนำเข้า">'+
        (template?'<small>เลขชุดที่เลือก '+formatNum(template.next_serial)+'–'+formatNum(template.last_serial)+
          ' ('+template.reserved_count+' ใบ)</small>':'<small>ใช้ไฟล์ที่จองไว้ได้แม้เปิดหน้านี้ใหม่ภายใน 7 วัน</small>')+
        '</div></div>'+
        (myReservations.length?'<div class="cert-preview"><h4>แบบฟอร์มที่คุณจองไว้ (ไม่เกิน 7 วัน)</h4>'+
          myReservations.map((item,i)=>'<div class="cert-preview-actions"><span>เลข '+
          safe(formatNum(item.next_serial))+'–'+safe(formatNum(item.last_serial))+
          ' ('+safe(item.reserved_count)+' ใบ)</span> '+
          '<button class="btn btn-secondary" id="cert-ledger-recover-'+i+
          '" type="button">ดาวน์โหลดแบบฟอร์มชุดเดิมอีกครั้ง</button></div>').join('')+'</div>':'')+
        (lastNotice?'<div class="cert-notice" role="status">'+safe(lastNotice)+'</div>':'')+
        (fetchError?'<div class="cert-error" role="alert">โหลดข้อมูลไม่สำเร็จ: '+safe(fetchError)+'</div>':'')+
        (pending?'<div class="cert-preview"><h4>ตรวจสอบข้อมูลก่อนบันทึก · '+pendingCount+' รายการ</h4>'+
          '<p>เลขคุมที่เตรียมนำเข้า: <strong>'+formatNum(pending.rows[0].serial_no)+'–'+
          formatNum(pending.rows[pendingCount-1].serial_no)+'</strong></p>'+
          (pending.warnings.length?'<div class="cert-warning"><strong>ข้อควรตรวจ '+
             pending.warnings.length+' จุด</strong><ul>'+pending.warnings.slice(0,12).map(w=>'<li>'+safe(w)+'</li>').join('')+'</ul></div>':'')+
          '<div class="cert-table-scroll"><table class="table cert-table"><thead><tr>'+
          HEADERS.map(h=>'<th>'+safe(h)+'</th>').join('')+'</tr></thead><tbody>'+
          pending.rows.slice(0,12).map(x=>'<tr><td>'+formatNum(x.serial_no)+'</td><td>'+safe(x.recipient_name)+
          '</td><td>'+safe(x.grade_level)+'</td><td>'+safe(x.activity)+'</td><td>'+safe(x.note)+'</td></tr>').join('')+
          '</tbody></table></div>'+(pendingCount>12?'<small>แสดง 12 จาก '+pendingCount+' รายการ</small>':'')+
          '<div class="cert-preview-actions"><button class="btn btn-primary" id="cert-ledger-confirm" type="button">ยืนยันบันทึก '+
          pendingCount+' รายการ</button><button class="btn btn-secondary" id="cert-ledger-cancel" type="button">ยกเลิกการตรวจตัวอย่าง</button></div></div>':'')+
        '<div class="cert-list-header"><div><h4>ทะเบียนเกียรติบัตร</h4><small>ทะเบียนแยกปีและไม่แก้เลขเดิม · เลขที่จองแล้วไม่นำกลับมาใช้ซ้ำ</small></div>'+
        '<label>ค้นหา <input class="input" id="cert-ledger-search" type="search" value="'+safe(searchText)+'" placeholder="เลขคุม / ชื่อ / ชั้น / รายการ"></label></div>'+
        '<div class="cert-table-scroll"><table class="table cert-table"><thead><tr>'+
          HEADERS.map(h=>'<th>'+safe(h)+'</th>').join('')+'</tr></thead>'+
        '<tbody id="cert-ledger-tbody">'+renderRows(matches)+'</tbody></table></div>'+
        '<div class="cert-count" id="cert-ledger-count">แสดง '+matches.length.toLocaleString("th-TH")+' จาก '+
          records.length.toLocaleString("th-TH")+' รายการ</div></section>';
    }
    function styledSheet(XLSX,rows){
      const ws=XLSX.utils.aoa_to_sheet(rows);
      ws["!cols"]=[{wch:21},{wch:44},{wch:37},{wch:28},{wch:35}];
      for(let i=1;i<rows.length;i++){
        const cell="A"+(i+1);
        if(ws[cell]){ws[cell].t="s";ws[cell].v=String(rows[i][0]);ws[cell].z="@";}
      }
      return ws;
    }
    async function writeReservedWorkbook(XLSX,session){
      const first=Number(session.next_serial), count=Number(session.reserved_count),
        last=Number(session.last_serial), year=Number(session.academic_year);
      if(!session.token||!Number.isInteger(first)||!Number.isInteger(count)||count<1||count>500||
        last!==first+count-1||year!==academicYear)throw new Error("รายละเอียดการจองเลขไม่ถูกต้อง");
      const table=[HEADERS];
      for(let i=0;i<count;i++)table.push([formatNum(first+i,year),"","","",""]);
      const workbook=XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook,styledSheet(XLSX,table),TEMPLATE_SHEET);
      const meta=XLSX.utils.aoa_to_sheet([
        ["รายการ","ข้อมูลระบบ"],["ปีการศึกษา",year],["เลขเริ่มต้น",first],
        ["เลขสิ้นสุด",last],["จำนวนที่จอง",count],["รหัสแบบฟอร์ม",session.token],
        ["คำแนะนำ","กรอกชื่อ ชั้น และรายการครบทุกแถว ห้ามแก้เลขคุม"],
        ["สำคัญ","จองเลขแล้วและใช้ได้ 1 ครั้งภายใน 7 วัน"]
      ]);
      meta["!cols"]=[{wch:22},{wch:88}];
      XLSX.utils.book_append_sheet(workbook,meta,META_SHEET);
      const bytes=XLSX.write(workbook,{bookType:"xlsx",type:"array"});
      downloadBlob(new Blob([bytes],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),
        'แบบฟอร์มเลขคุมเกียรติบัตร_'+year+'_'+first+'-'+last+'.xlsx');
      template={token:session.token,academic_year:year,next_serial:first,last_serial:last,reserved_count:count};
    }
    async function downloadTemplate(){
      const count=Number(document.getElementById("cert-ledger-reserve-count")?.value);
      if(!Number.isInteger(count)||count<1||count>500)throw new Error("กรุณาเลือกจำนวน 1–500 ใบ");
      reservationCount=count;
      // Verify Excel tooling before consuming a number range.
      const XLSX=await ensureXlsx();
      const {data,error}=await supabase.rpc("reserve_academic_certificate_template",{p_year:academicYear,p_quantity:count});
      if(error){
        if((error.message||"").includes("HISTORICAL_IMPORT_REQUIRED"))
          throw new Error("ต้องนำเข้าและตรวจทะเบียนปีการศึกษาเดิมก่อนจึงจะจองเลขต่อได้");
        throw error;
      }
      // Save booking ID before creating the workbook; it stays recoverable server-side.
      template={token:data?.token,academic_year:academicYear,next_serial:data?.next_serial,
        last_serial:data?.last_serial,reserved_count:count};
      await writeReservedWorkbook(XLSX,template);
      pending=null;
      lastNotice='จองเลขสำเร็จ '+count+' ใบ · เลข '+formatNum(template.next_serial)+'–'+formatNum(template.last_serial);
      await load();await renderDashboard();
    }
    async function redownloadReservation(item){
      const XLSX=await ensureXlsx();
      await writeReservedWorkbook(XLSX,item);
      lastNotice='ดาวน์โหลดแบบฟอร์มชุดเดิม เลข '+formatNum(item.next_serial)+'–'+formatNum(item.last_serial)+' โดยไม่จองเลขเพิ่ม';
      await renderDashboard();
    }
    function excelNumber(value,year,serialIndex){
      if(typeof value==="number" && Number.isInteger(value)){
        // Excel interprets "1/2569"..."12/2569" as dates (m/yyyy).
        // Recover only exact first-day, matching-year month entries.
        if(value>100000){
          const date=new Date(Date.UTC(1899,11,30)+value*86400000);
          if(date.getUTCFullYear()===year&&date.getUTCDate()===1&&date.getUTCMonth()+1===serialIndex)
            return {number:date.getUTCMonth()+1,converted:true};
        }
        throw new Error(`เลขคุมแถว ${serialIndex+1} เป็นตัวเลข/วันที่ กรุณาใช้ข้อความ เช่น ${serialIndex}/${year}`);
      }
      const raw=text(value).replace(/^'/,"");
      const match=raw.match(/^([0-9]{1,6})\s*\/\s*(25[0-9]{2}|26[0-9]{2}|2700)$/);
      if(!match||Number(match[2])!==year)throw new Error(`เลขคุมไม่ถูกต้อง: ${raw||"(ว่าง)"} ต้องเป็น เลข/${year}`);
      return {number:Number(match[1]),converted:false};
    }
    async function parseFile(file){
      if(!/\.(xlsx|xls)$/i.test(file?.name||""))throw new Error("รับเฉพาะ Excel .xlsx หรือ .xls");
      if(file.size>15*1024*1024)throw new Error("ไฟล์เกิน 15 MB");
      const XLSX=await ensureXlsx();
      const workbook=XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:false,cellNF:true});
      const dataSheet=workbook.Sheets[TEMPLATE_SHEET];
      if(!dataSheet)throw new Error("ไม่พบชีตบัญชีคุมเกียรติบัตร");
      const data=XLSX.utils.sheet_to_json(dataSheet,{header:1,raw:true,defval:"",blankrows:false});
      if(!data.length||HEADERS.some((h,i)=>text(data[0]?.[i])!==h))
        throw new Error("หัวตารางไม่ตรงแบบฟอร์ม Excel 5 คอลัมน์");
      if((data[0]||[]).slice(5).some(v=>text(v)))throw new Error("มีข้อมูลเกิน 5 คอลัมน์");
      const meta=workbook.Sheets[META_SHEET];
      if(!meta)throw new Error("ไม่พบรหัสจองเลขในแบบฟอร์ม กรุณาใช้แบบฟอร์มล่าสุดจากระบบ");
      const details=XLSX.utils.sheet_to_json(meta,{header:1,raw:true,defval:""});
      const kv=new Map(details.map(row=>[text(row[0]),text(row[1])]));
      const year=Number(kv.get("ปีการศึกษา")),first=Number(kv.get("เลขเริ่มต้น")),
        last=Number(kv.get("เลขสิ้นสุด")),count=Number(kv.get("จำนวนที่จอง")),
        token=kv.get("รหัสแบบฟอร์ม");
      if(year!==academicYear||!Number.isInteger(first)||first<1||
        !Number.isInteger(count)||count<1||count>500||
        !Number.isInteger(last)||last!==first+count-1||
        !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(token))
          throw new Error("ข้อมูลปีการศึกษา/เลขจองไม่ถูกต้อง กรุณาเลือกปีให้ตรงกับไฟล์");
      // The server verifies ownership, unused status, and exact reserved range.
      template={token,academic_year:year,next_serial:first,last_serial:last,reserved_count:count};
      const rows=[],warnings=[];let converted=0;
      for(let i=1;i<data.length;i++){
        const cells=data[i]||[];
        if(cells.slice(5).some(v=>text(v)))throw new Error('แถว '+(i+1)+' มีข้อมูลเกิน 5 คอลัมน์');
        const fields=cells.slice(1,5).map(text);
        if(!fields.some(Boolean))continue;
        if(!fields[0]||!fields[1]||!fields[2])
          throw new Error('แถว '+(i+1)+' ต้องกรอกชื่อ ชั้น และรายการให้ครบ');
        const expected=first+rows.length;
        if(expected>last)throw new Error("จำนวนแถวเกินเลขที่จอง");
        const num=excelNumber(cells[0],academicYear,expected);
        if(num.number!==expected)
          throw new Error('แถว '+(i+1)+' ต้องเป็นเลข '+formatNum(expected));
        if(num.converted)converted++;
        if(fields[0].length>500||fields[1].length>300||fields[2].length>500||fields[3].length>1000)
          throw new Error('ข้อความแถว '+(i+1)+' ยาวเกินที่ระบบรองรับ');
        rows.push({serial_no:expected,recipient_name:fields[0],grade_level:fields[1],
          activity:fields[2],note:fields[3]});
      }
      if(rows.length!==count)throw new Error('จองเลขไว้ '+count+' ใบ ต้องกรอกครบทุกเลข (พบ '+rows.length+' ใบ)');
      if(converted)warnings.push('แก้ไขเลขคุมที่ Excel แปลงเป็นวันที่แล้ว '+converted+' รายการ');
      pending={rows,warnings,fileName:file.name};
      lastNotice='ตรวจไฟล์ '+file.name+' แล้ว กรุณาตรวจตัวอย่างและยืนยันบันทึก';
      await renderDashboard();
    }
    async function savePending(){
      if(!template||!pending?.rows?.length)throw new Error("ไม่พบข้อมูลรอบันทึก");
      const {data,error}=await supabase.rpc("import_academic_certificate_template",{
        p_token:template.token,p_rows:pending.rows
      });
      if(error){
        const msg=error.message||"";
        if(msg.includes("RESERVED_QUANTITY_MISMATCH"))throw new Error("จำนวนแถวไม่ตรงกับที่จอง");
        if(msg.includes("TEMPLATE_INVALID_OR_USED")||msg.includes("TEMPLATE_EXPIRED"))
          throw new Error("แบบฟอร์มถูกใช้แล้วหรือหมดอายุ กรุณาตรวจสอบเลขที่จอง");
        if(msg.includes("LEGACY_TEMPLATE_MUST_REDOWNLOAD"))
          throw new Error("แบบฟอร์มรุ่นเก่าต้องดาวน์โหลดใหม่");
        throw error;
      }
      const total=Number(data?.saved)||pending.rows.length;
      pending=null;template=null;
      lastNotice='บันทึกสำเร็จ '+total+' รายการ · เลขที่จองจะไม่ถูกนำกลับมาใช้ซ้ำ';
      toast("บันทึกเลขคุมเกียรติบัตรแล้ว",total+" รายการ","success");
      await load();await renderDashboard();
    }
    async function exportExcel(){
      if(!records.length)return;
      const XLSX=await ensureXlsx();
      const data=[HEADERS,...records.map(r=>[`${r.serial_no}/${r.academic_year}`,r.recipient_name,r.grade_level,r.activity,r.note||""])];
      const workbook=XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook,styledSheet(XLSX,data),TEMPLATE_SHEET);
      const bytes=XLSX.write(workbook,{bookType:"xlsx",type:"array"});
      downloadBlob(new Blob([bytes],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),`ทะเบียนเลขคุมเกียรติบัตร_${academicYear}.xlsx`);
    }
    function protect(button,fn){
      if(!button)return;
      button.addEventListener("click",async()=>{
        if(button.disabled)return;
        button.disabled=true;
        try {await fn();}
        catch(error){const message=error?.message||String(error);toast("ดำเนินการไม่สำเร็จ",message,"error");lastNotice="ข้อผิดพลาด: "+message;await renderDashboard();}
        finally{if(button.isConnected)button.disabled=false;}
      });
    }
    async function bind(){
      protect(document.getElementById("cert-ledger-change-year"),async()=>{
        const value=Number(document.getElementById("cert-ledger-year")?.value);
        if(!Number.isInteger(value)||value<2500||value>2700)throw new Error("กรุณาเลือกปีการศึกษา พ.ศ. 2500–2700");
        if(value!==academicYear){academicYear=value;template=null;pending=null;searchText="";lastNotice="";await load();}
        await renderDashboard();
      });
      protect(document.getElementById("cert-ledger-download"),downloadTemplate);
      protect(document.getElementById("cert-ledger-export"),exportExcel);
      myReservations.forEach((item,i)=>protect(document.getElementById("cert-ledger-recover-"+i),()=>redownloadReservation(item)));
      protect(document.getElementById("cert-ledger-confirm"),savePending);
      protect(document.getElementById("cert-ledger-cancel"),async()=>{pending=null;lastNotice="ยกเลิกการตรวจตัวอย่างแล้ว แต่เลขชุดนี้ยังคงถูกจองไว้";await renderDashboard();});
      document.getElementById("cert-ledger-file")?.addEventListener("change",async event=>{
        const file=event.currentTarget.files?.[0];if(!file)return;
        try{await parseFile(file);}catch(error){const message=error?.message||String(error);toast("ตรวจ Excel ไม่ผ่าน",message,"error");pending=null;lastNotice="ไม่สามารถนำเข้า: "+message;await renderDashboard();}
      });
      document.getElementById("cert-ledger-search")?.addEventListener("input",event=>{
        searchText=event.currentTarget.value;
        const matches=visibleRecords(),body=document.getElementById("cert-ledger-tbody"),count=document.getElementById("cert-ledger-count");
        if(body)body.innerHTML=renderRows(matches);
        if(count)count.textContent=`แสดง ${matches.length.toLocaleString("th-TH")} จาก ${records.length.toLocaleString("th-TH")} รายการ`;
      });
    }
    return {load,view,bind};
  }

export {createAcademicCertificateRegistryFeature};
