"""Guarded frontend reliability patch: debounce Realtime and paginate high-growth lists."""
from pathlib import Path
p=Path('app.js')
src=p.read_text()
anchor='function subscribeRealtime() {'
if 'function queueRealtimeDashboardRefresh()' not in src:
    assert src.count(anchor)==1, 'Expected one realtime subscriber'
    helper="""let bnkRealtimeRefreshTimer=null;
let bnkRealtimeRefreshActive=false;
let bnkRealtimeRefreshPending=false;
function queueRealtimeDashboardRefresh(){
  bnkRealtimeRefreshPending=true;
  if(bnkRealtimeRefreshTimer||bnkRealtimeRefreshActive)return;
  bnkRealtimeRefreshTimer=setTimeout(async()=>{
    bnkRealtimeRefreshTimer=null;
    if(!state.user||state.profile?.account_status!=="active"){bnkRealtimeRefreshPending=false;return;}
    bnkRealtimeRefreshActive=true;
    bnkRealtimeRefreshPending=false;
    try{await renderDashboard();}
    catch(error){console.warn("BNK Realtime refresh",error);}
    finally{bnkRealtimeRefreshActive=false;if(bnkRealtimeRefreshPending)queueRealtimeDashboardRefresh();}
  },300);
}
"""
    start=src.index(anchor)
    end=src.index('supabase.auth.onAuthStateChange',start)
    chunk=src[start:end]
    count=chunk.count('await renderDashboard()')
    assert count>=10, 'Expected ten or more realtime render calls; found '+str(count)
    chunk=chunk.replace('await renderDashboard()','queueRealtimeDashboardRefresh()')
    src=src[:start]+chunk+src[end:]
    src=src.replace(anchor,helper+'\n'+anchor,1)
    print('Debounced '+str(count)+' realtime dashboard reload callbacks')
changes=[
 ('supabase.from("timetable_entries").select("*").order("weekday").order("created_at"),',
  'fetchAllSupabaseRows(()=>supabase.from("timetable_entries").select("*").order("weekday").order("created_at").order("id")),'),
 ('supabase.from("teaching_assignments").select("*").eq("is_active",true).order("created_at"),',
  'fetchAllSupabaseRows(()=>supabase.from("teaching_assignments").select("*").eq("is_active",true).order("created_at").order("id")),'),
 ('supabase.from("academic_subjects").select("*").eq("is_active",true).order("subject_name"),',
  'fetchAllSupabaseRows(()=>supabase.from("academic_subjects").select("*").eq("is_active",true).order("subject_name").order("id")),')
]
for old,new in changes:
    if new not in src:
        assert src.count(old)==1, 'Data paging pattern changed: '+old
        src=src.replace(old,new)
p.write_text(src)
p=Path('index.html')
s=p.read_text()
assert s.count('app.min.js?v=5.12.9.55')==1
p.write_text(s.replace('app.min.js?v=5.12.9.55','app.min.js?v=5.12.9.56'))
print('Frontend reliability guards updated')
