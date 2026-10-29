export function paginateRows(rows,requestedPage,pageSize=50){
  const list=Array.isArray(rows)?rows:[];
  const size=Math.max(1,Math.floor(Number(pageSize)||50));
  const totalPages=Math.max(1,Math.ceil(list.length/size));
  const page=Math.min(totalPages,Math.max(1,Math.floor(Number(requestedPage)||1)));
  const start=(page-1)*size;
  return {page,totalPages,start,end:Math.min(start+size,list.length),rows:list.slice(start,start+size),total:list.length};
}
