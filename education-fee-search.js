// Shared read-only search for current and historical education-fee ledgers.
// Normalize stray spaces, non-breaking spaces and zero-width characters in Thai names.
export const feeSearchKey=value=>String(value??"").normalize("NFKC").toLocaleLowerCase("th-TH")
 .replace(/[\s\u200b-\u200d\ufeff]+/g,"");
export function feeStudentMatches(record,query){
 const needle=feeSearchKey(query);
 if(!needle)return true;
 return [record?.full_name,record?.student_code].some(value=>feeSearchKey(value).includes(needle));
}
