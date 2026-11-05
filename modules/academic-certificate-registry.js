
  function createAcademicCertificateRegistryFeature({supabase,state,escapeHtml,ensureXlsx,downloadBlob,toast,renderDashboard}) {
    const HEADERS = ["เลขเกียรติบัตร","คำนำหน้า ชื่อสกุล","ชั้น","รายการ","หมายเหตุ"];
    const TEMPLATE_SHEET = "บัญชีคุมเกียรติบัตร";
    const META_SHEET = "ข้อมูลแบบฟอร์ม";
    let academicYear = Number(state?.academicTerms?.[0]?.academic_year || new Date().getFullYear()+543);
    if (!Number.isInteger(academicYear) || academicYear<2500 || academicYear>2700) academicYear=2569;
    let records=[],fetchError="",searchText="",template=null,pending=null,lastNotice="";
    const text = x=>String(x??"").trim();
    const safe=x=>escapeHtml(String(x??""));
    const formatNum=n=>`${n}/${academicYear}`;
    function visibleRecords(){
      const term=searchText.toLocaleLowerCase("th");
      return term?records.filter(r=>[`${r.serial_no}/${r.academic_year}`,r.recipient_name,r.grade_level,r.activity,r.note].some(v=>String(v||"").toLocaleLowerCase("th").includes(term))):records;
    }
    async function load(){
      fetchError="";
      try {
        const result=[];
        for(let offset=0;offset<100000;offset+=1000){
          const {data,error}=await supabase.from("academic_certificate_registry")
            .select("id,academic_year,serial_no,recipient_name,grade_level,activity,note,created_at")
            .eq("academic_year",academicYear).order("serial_no",{ascending:true})
            .range(offset,offset+999);
          if(error)throw error;
          result.push(...(data||[]));
          if((data||[]).length<1000)break;
        }
        records=result;
      }catch(error){fetchError=error?.message||String(error);}
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
      const last=records.reduce((m,r)=>Math.max(m,Number(r.serial_no)||0),0);
      const matches=visibleRecords();
      const pendingCount=pending?.rows?.length||0;
      return `<section class="panel cert-ledger">
        <div class="panel-head"><div class="panel-title-wrap">
          <h3>ทะเบียนเลขคุมเกียรติบัตรประจำปีการศึกษา</h3>
          <p>ทุกผู้ใช้งานโรงเรียนที่มีบัญชีใช้งานสามารถดู ดาวน์โหลดแบบฟอร์ม นำเข้า และส่งออกได้ · ใช้ Excel 5 คอลัมน์ตามไฟล์ต้นฉบับ</p>
        </div></div>
        <div class="cert-toolbar">
          <label class="cert-year-field">ปีการศึกษา
            <input class="input" id="cert-ledger-year" type="number" min="2500" max="2700" step="1" value="${academicYear}" />
          </label>
          <button class="btn btn-secondary" type="button" id="cert-ledger-change-year">แสดงข้อมูลปีนี้</button>
          <button class="btn btn-secondary" type="button" id="cert-ledger-export" ${records.length?"":"disabled"}>ส่งออก Excel</button>
        </div>
        <div class="cert-stats">
          <div><span>ปีการศึกษา</span><strong>${academicYear}</strong></div>
          <div><span>รายการที่บันทึก</span><strong>${records.length.toLocaleString("th-TH")}</strong></div>
          <div><span>เลขคุมล่าสุด</span><strong>${last?formatNum(last):"ยังไม่มี"}</strong></div>
          <div><span>เลขถัดไป</span><strong>${formatNum(last+1)}</strong></div>
        </div>
        <div class="cert-upload-flow">
          <div class="cert-flow-card">
            <strong>1. ดาวน์โหลดแบบฟอร์มก่อนทุกครั้ง</strong>
            <p>ระบบออกเลขคุมถัดไปอัตโนมัติ และผูกแบบฟอร์มกับปีการศึกษาและข้อมูลล่าสุด</p>
            <button class="btn btn-primary" id="cert-ledger-download" type="button">ดาวน์โหลดแบบฟอร์ม Excel ล่าสุด</button>
          </div>
          <div class="cert-flow-card">
            <strong>2. กรอกข้อมูลแล้วนำเข้า</strong>
            <p>ใช้แบบฟอร์มที่ดาวน์โหลด หรือเลือก Excel เดิมที่มี 5 คอลัมน์หลังดาวน์โหลดแบบฟอร์มในหน้านี้แล้ว</p>
            <input type="file" accept=".xlsx,.xls" id="cert-ledger-file" ${template?"":"disabled"} aria-label="เลือกไฟล์ Excel เพื่อนำเข้า" />
            ${template?`<small>รับแบบฟอร์มปี ${template.academic_year} แล้ว · เริ่มเลข ${template.next_serial}/${template.academic_year}</small>`:'<small>ต้องกดดาวน์โหลดแบบฟอร์มก่อนจึงจะเลือกไฟล์ได้</small>'}
          </div>
        </div>
        ${lastNotice?`<div class="cert-notice" role="status">${safe(lastNotice)}</div>`:""}
        ${fetchError?`<div class="cert-error" role="alert">โหลดข้อมูลไม่สำเร็จ: ${safe(fetchError)}</div>`:""}
        ${pending?`<div class="cert-preview">
          <h4>ตรวจสอบข้อมูลก่อนบันทึก · ${pendingCount} รายการ</h4>
          <p>เลขคุมที่เตรียมนำเข้า: <strong>${pendingCount?`${pending.rows[0].serial_no}/${academicYear} – ${pending.rows[pendingCount-1].serial_no}/${academicYear}`:"—"}</strong></p>
          ${pending.warnings.length?`<div class="cert-warning"><strong>ข้อควรตรวจ ${pending.warnings.length} จุด</strong><ul>${pending.warnings.slice(0,12).map(w=>`<li>${safe(w)}</li>`).join("")}</ul></div>`:""}
          <div class="cert-table-scroll"><table class="table cert-table"><thead><tr>${HEADERS.map(x=>`<th>${safe(x)}</th>`).join("")}</tr></thead><tbody>${pending.rows.slice(0,12).map(r=>`<tr><td>${r.serial_no}/${academicYear}</td><td>${safe(r.recipient_name)}</td><td>${safe(r.grade_level)}</td><td>${safe(r.activity)}</td><td>${safe(r.note)}</td></tr>`).join("")}</tbody></table></div>
          ${pendingCount>12?`<small>แสดงตัวอย่าง 12 จาก ${pendingCount} รายการ</small>`:""}
          <div class="cert-preview-actions">
            <button class="btn btn-primary" id="cert-ledger-confirm" type="button">ยืนยันบันทึก ${pendingCount} รายการ</button>
            <button class="btn btn-secondary" id="cert-ledger-cancel" type="button">ยกเลิก</button>
          </div>
        </div>`:""}
        <div class="cert-list-header">
          <div><h4>ทะเบียนเกียรติบัตร</h4><small>ไม่แก้หรือทับเลขคุมเดิม · แยกทะเบียนตามปีการศึกษา</small></div>
          <label>ค้นหา <input class="input" id="cert-ledger-search" type="search" value="${safe(searchText)}" placeholder="เลขคุม / ชื่อ / ชั้น / รายการ" /></label>
        </div>
        <div class="cert-table-scroll"><table class="table cert-table">
          <thead><tr>${HEADERS.map(x=>`<th>${safe(x)}</th>`).join("")}</tr></thead>
          <tbody id="cert-ledger-tbody">${renderRows(matches)}</tbody>
        </table></div>
        <div class="cert-count" id="cert-ledger-count">แสดง ${matches.length.toLocaleString("th-TH")} จาก ${records.length.toLocaleString("th-TH")} รายการ</div>
      </section>`;
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
    async function downloadTemplate(){
      const {data,error}=await supabase.rpc("issue_academic_certificate_template",{p_year:academicYear});
      if(error)throw error;
      if(!data?.token||!Number.isInteger(Number(data.next_serial)))throw new Error("ไม่สามารถรับข้อมูลแบบฟอร์มจากฐานข้อมูล");
      const XLSX=await ensureXlsx();
      const next=Number(data.next_serial),max=200;
      const table=[HEADERS];
      for(let i=0;i<max;i++)table.push([`${next+i}/${academicYear}`,"","","",""]);
      const workbook=XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook,styledSheet(XLSX,table),TEMPLATE_SHEET);
      const meta=XLSX.utils.aoa_to_sheet([
        ["รายการ","ข้อมูลระบบ"],["ปีการศึกษา",academicYear],["เลขเริ่มต้น",next],
        ["รหัสแบบฟอร์ม",data.token],["คำแนะนำ","กรอกเฉพาะแถวที่ต้องการใช้ แล้วอัปโหลดในระบบ ห้ามแก้เลขคุม"],
        ["สำคัญ","แบบฟอร์มใช้ได้ 1 ครั้ง หากมีผู้บันทึกเพิ่มก่อน ต้องดาวน์โหลดใหม่"]
      ]);
      meta["!cols"]=[{wch:22},{wch:88}];
      XLSX.utils.book_append_sheet(workbook,meta,META_SHEET);
      const bytes=XLSX.write(workbook,{bookType:"xlsx",type:"array"});
      downloadBlob(new Blob([bytes],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),`แบบฟอร์มเลขคุมเกียรติบัตร_${academicYear}_เริ่ม${next}.xlsx`);
      template={token:data.token,academic_year:academicYear,next_serial:next};
      pending=null;
      lastNotice=`ดาวน์โหลดแบบฟอร์มสำเร็จ · ใช้เลขตั้งแต่ ${next}/${academicYear} เป็นต้นไป · หลังกรอกแล้วนำเข้าจากหน้านี้`;
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
      if(!template||template.academic_year!==academicYear)throw new Error("กรุณาดาวน์โหลดแบบฟอร์มปีการศึกษานี้ก่อน");
      if(!/\.(xlsx|xls)$/i.test(file?.name||""))throw new Error("รับเฉพาะไฟล์ Excel .xlsx หรือ .xls");
      if(file.size>15*1024*1024)throw new Error("ไฟล์เกิน 15 MB");
      const XLSX=await ensureXlsx();
      const workbook=XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:false,cellNF:true});
      const dataSheet=workbook.Sheets[TEMPLATE_SHEET]||workbook.Sheets[workbook.SheetNames[0]];
      const data=XLSX.utils.sheet_to_json(dataSheet,{header:1,raw:true,defval:"",blankrows:false});
      if(!data.length||HEADERS.some((h,i)=>text(data[0]?.[i])!==h))throw new Error("หัวตารางไม่ตรง 5 คอลัมน์ตามแบบฟอร์ม กรุณาตรวจไฟล์");
      if((data[0]||[]).slice(5).some(v=>text(v)))throw new Error("มีคอลัมน์เกินจาก 5 คอลัมน์ตามแบบฟอร์ม");
      const info=workbook.Sheets[META_SHEET];
      if(info){
        const details=XLSX.utils.sheet_to_json(info,{header:1,defval:"",raw:true});
        const key=new Map(details.map(r=>[text(r[0]),text(r[1])]));
        if(key.get("รหัสแบบฟอร์ม")!==template.token||Number(key.get("ปีการศึกษา"))!==academicYear||Number(key.get("เลขเริ่มต้น"))!==template.next_serial)
          throw new Error("แบบฟอร์มนี้ไม่ใช่ฉบับที่เพิ่งดาวน์โหลด กรุณาดาวน์โหลดแบบฟอร์มล่าสุดอีกครั้ง");
      }
      const rows=[],warnings=[];
      let converted=0;
      for(let i=1;i<data.length;i++){
        const cells=data[i]||[];
        if(cells.slice(5).some(v=>text(v)))throw new Error(`แถว ${i+1} มีข้อมูลเกิน 5 คอลัมน์`);
        const fields=cells.slice(1,5).map(text);
        if(!fields.some(Boolean))continue;
        if(!fields[0]||!fields[1]||!fields[2])throw new Error(`แถว ${i+1} กรุณากรอกชื่อ ชั้น และรายการให้ครบ`);
        const expected=template.next_serial+rows.length;
        const num=excelNumber(cells[0],academicYear,expected);
        if(num.number!==expected)throw new Error(`แถว ${i+1} เลขคุมต้องต่อเนื่องเป็น ${expected}/${academicYear} แต่พบ ${num.number}/${academicYear}`);
        if(num.converted)converted++;
        if(fields[0].length>500||fields[1].length>300||fields[2].length>500||fields[3].length>1000)
          throw new Error(`แถว ${i+1} มีข้อความยาวเกินที่ระบบรองรับ`);
        if(fields[0].includes("ห้องเรียน")&&fields[1].includes("ห้องเรียน")&&fields[0].replace(/\s+/g,"")!==fields[1].replace(/\s+/g,""))
          warnings.push(`แถว ${i+1}: ชื่อห้องและชั้นไม่ตรงกัน (${fields[0]} / ${fields[1]})`);
        rows.push({serial_no:expected,recipient_name:fields[0],grade_level:fields[1],activity:fields[2],note:fields[3]});
      }
      if(!rows.length)throw new Error("ไม่พบรายการที่กรอกข้อมูลในไฟล์");
      if(rows.length>500)throw new Error("นำเข้าได้สูงสุด 500 รายการต่อครั้ง กรุณาแบ่งชุด");
      if(converted)warnings.unshift(`ระบบอ่านเลขคุมที่ Excel เปลี่ยนเป็นวันที่กลับเป็นเลขคุมแล้ว ${converted} รายการ`);
      pending={rows,warnings,fileName:file.name};
      lastNotice=`อ่านไฟล์ ${file.name} แล้ว · กรุณาตรวจตัวอย่างและกดยืนยันก่อนบันทึก`;
      await renderDashboard();
    }
    async function savePending(){
      if(!template||!pending?.rows?.length)throw new Error("ไม่พบข้อมูลรอนำเข้า");
      const {data,error}=await supabase.rpc("import_academic_certificate_template",{p_token:template.token,p_rows:pending.rows});
      if(error){
        const msg=error.message||"";
        if(msg.includes("STALE_TEMPLATE"))throw new Error("มีผู้อื่นบันทึกเลขคุมเพิ่มแล้ว กรุณาดาวน์โหลดแบบฟอร์มใหม่เพื่อให้เลขต่อเนื่อง");
        if(msg.includes("TEMPLATE_INVALID_OR_USED")||msg.includes("TEMPLATE_EXPIRED"))
          throw new Error("แบบฟอร์มหมดอายุหรือถูกใช้ไปแล้ว กรุณาดาวน์โหลดใหม่");
        throw error;
      }
      const total=Number(data?.saved)||pending.rows.length;
      pending=null;template=null;
      lastNotice=`บันทึกสำเร็จ ${total} รายการ · เลขถัดไป ${data.next_serial}/${academicYear} · ครั้งถัดไปต้องดาวน์โหลดแบบฟอร์มใหม่`;
      toast("บันทึกเลขคุมเกียรติบัตรแล้ว",`${total} รายการ`,"success");
      await load();
      await renderDashboard();
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
      protect(document.getElementById("cert-ledger-confirm"),savePending);
      protect(document.getElementById("cert-ledger-cancel"),async()=>{pending=null;lastNotice="ยกเลิกการนำเข้าชุดนี้แล้ว";await renderDashboard();});
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
