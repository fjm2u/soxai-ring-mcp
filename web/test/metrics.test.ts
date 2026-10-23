import {describe,it,expect,vi} from 'vitest';
import {number,date,instant,normalize,range,measurements} from '../src/metrics';
import * as soxai from '../src/soxai';
const session={uid:'owner',token:'test',refresh:'test',expires:9999999999};
describe('data contract',()=>{
  it('preserves missingness, rejects text and unsafe numeric values',()=>{
    for(const value of [null,true,{},[],Infinity,'NaN','private',''])expect(number(value)).toBeNull();
    expect(number(0)).toBe(0);expect(number('1e2')).toBe(100);
  });
  it('validates date ranges and explicit offsets',()=>{
    expect(()=>date('2026-02-30')).toThrow();expect(()=>instant('2026-01-01T10:00:00')).toThrow();
    expect(()=>range('2026-01-01','2026-05-01')).toThrow();
    expect(instant('2026-10-01T09:00:00+09:00')).toBe(date('2026-10-01'));
  });
  it('checks ownership before filtering and strips identifying fields',()=>{
    expect(()=>normalize([{uid:'other',_time:'2000-01-01T00:00:00Z'}],'owner','daily','2026-10-01','2026-10-02')).toThrow('UID_MISMATCH');
    const rows=normalize([{uid:'owner',_time:'2026-10-01T00:00:00Z',activity_steps:0,health_email:3,email:'private',health_hrv:null}],'owner','daily','2026-10-01','2026-10-01');
    expect(rows).toEqual([{date:'2026-10-01',activity_steps:0,health_hrv:null}]);
    expect(()=>normalize([{uid:'owner',_time:'2026-10-01T00:00:00Z'},{uid:'owner',_time:'2026-10-01T01:00:00Z'}],'owner','daily','2026-10-01','2026-10-01')).toThrow('AMBIGUOUS_DAILY_DATA');
  });
  it('paginates and rejects unavailable metrics',async()=>{
    const mock=vi.spyOn(soxai,'data').mockResolvedValue([{uid:'owner',_time:'2026-10-01T00:00:00Z',activity_steps:0},{uid:'owner',_time:'2026-10-02T00:00:00Z',activity_steps:10}]);
    try{const result=await measurements(session,'daily',{start_date:'2026-10-01',end_date:'2026-10-02',limit:1});expect(result.next_offset).toBe(1);expect(result.returned_rows).toBe(1);await expect(measurements(session,'daily',{start_date:'2026-10-01',end_date:'2026-10-02',metrics:['health_hrv']})).rejects.toThrow('METRIC_UNAVAILABLE');}finally{mock.mockRestore();}
  });
});

describe('48-hour intraday retrieval',()=>{
 const args={start_datetime:'2026-10-01T09:00:00+09:00',end_datetime:'2026-10-03T09:00:00+09:00'};
 const row=(stamp:string,hr:number|null=0)=>({uid:'owner',_time:stamp,hr});
 it('splits, excludes shared boundaries and paginates the combined result',async()=>{
  const mock=vi.spyOn(soxai,'data').mockImplementation(async(_s,_k,start)=>start==='2026-10-01T00:00:00.000Z'?[row('2026-10-02T00:00:00Z'),row('2026-10-01T00:00:00Z')]:[row('2026-10-03T00:00:00Z'),row('2026-10-02T00:00:00Z',null)]);
  try{
   const first=await measurements(session,'intraday',{...args,limit:1});
   expect(first.total_rows).toBe(2);expect(first.next_offset).toBe(1);expect(first.records[0].hr).toBe(0);
   expect(mock.mock.calls.map(c=>c.slice(2))).toEqual([['2026-10-01T00:00:00.000Z','2026-10-02T00:00:00.000Z'],['2026-10-02T00:00:00.000Z','2026-10-03T00:00:00.000Z']]);
   const next=await measurements(session,'intraday',{...args,offset:1});expect(next.next_offset).toBeNull();expect(next.records).toEqual([{timestamp:'2026-10-02T00:00:00.000Z',hr:null}]);
  }finally{mock.mockRestore();}
 });
 it('validates duration before fetching and preserves shorter requests',async()=>{
  const mock=vi.spyOn(soxai,'data').mockResolvedValue([]);
  try{
   for(const end of ['2026-10-03T00:00:00.001Z','2026-10-01T00:00:00Z','2026-09-30T00:00:00Z'])await expect(measurements(session,'intraday',{...args,end_datetime:end})).rejects.toThrow('INVALID_RANGE');
   expect(mock).not.toHaveBeenCalled();
   await measurements(session,'intraday',{...args,end_datetime:'2026-10-02T00:00:00Z'});expect(mock).toHaveBeenCalledTimes(1);
   mock.mockClear();await measurements(session,'intraday',{...args,end_datetime:'2026-10-02T01:00:00Z'});expect(mock).toHaveBeenCalledTimes(2);
  }finally{mock.mockRestore();}
 });
 it('fails closed on second-chunk errors and UID mismatches',async()=>{
  const mock=vi.spyOn(soxai,'data');
  try{
   mock.mockResolvedValueOnce([]).mockRejectedValueOnce(new soxai.SafeError('API_ERROR'));await expect(measurements(session,'intraday',args)).rejects.toThrow('API_ERROR');
   mock.mockResolvedValueOnce([]).mockResolvedValueOnce([{...row('2000-01-01T00:00:00Z'),uid:'other'}]);await expect(measurements(session,'intraday',args)).rejects.toThrow('UID_MISMATCH');
  }finally{mock.mockRestore();}
 });
 it('enforces cumulative row and byte limits',async()=>{
  const mock=vi.spyOn(soxai,'data');
  try{
   mock.mockResolvedValue(Array.from({length:10001},()=>row('2026-10-01T00:00:00Z')));await expect(measurements(session,'intraday',args)).rejects.toThrow('RESPONSE_TOO_LARGE');
   mock.mockResolvedValue([{...row('2026-10-01T00:00:00Z'),extra:'x'.repeat(2_000_000)}]);await expect(measurements(session,'intraday',args)).rejects.toThrow('RESPONSE_TOO_LARGE');
  }finally{mock.mockRestore();}
 });
});

describe('tool interface',()=>{
 it('resolves daily ranges and reports documented metrics and missing dates',async()=>{
  const mock=vi.spyOn(soxai,'data').mockResolvedValue([{uid:'owner',_time:'2026-10-01T00:00:00Z',activity_steps:0}]);
  try {
   const query={days:2,end_date:'2026-10-02'};
   const daily=await measurements(session,'daily',query);
   expect(daily.available_metrics[0]).toMatchObject({name:"activity_steps",unit:"step",numeric_observations:1,missing_observations:0});expect(daily.coverage).toMatchObject({expected_days:2,missing_dates:["2026-10-02"]});
   await expect(measurements(session,'daily',{...query,start_date:'2026-10-01'})).rejects.toThrow('INVALID_RANGE');
  }finally{mock.mockRestore();}
 });
 it('pins rolling windows for subsequent pages across clock changes',async()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-03T00:00:00Z'));
  const source=[{uid:'owner',_time:'2026-10-01T00:00:00Z',hr:1},{uid:'owner',_time:'2026-10-02T00:00:00Z',hr:2}];
  const mock=vi.spyOn(soxai,'data').mockResolvedValue(source);
  try {
   const first=await measurements(session,'intraday',{hours:48,metrics:['hr'],limit:1});
   expect(first.available_metrics).toEqual([{name:'hr',unit:null,description:null,numeric_observations:2,missing_observations:0}]);expect(first.next_request?.kind).toBe('intraday');
   vi.setSystemTime(new Date('2026-10-04T00:00:00Z'));
   const next=await measurements(session,'intraday',first.next_request!);expect(next.range).toEqual(first.range);expect(next.records[0].hr).toBe(2);expect(next.next_request).toBeNull();
   expect((await measurements(session,'intraday',{})).range).toMatchObject({start:'2026-10-03T00:00:00.000Z',end:'2026-10-04T00:00:00.000Z'});
  }finally{mock.mockRestore();vi.useRealTimers();}
 });
 it('rejects incomplete and mixed ranges before fetching',async()=>{
  const mock=vi.spyOn(soxai,'data').mockResolvedValue([]);
  try{
   for(const args of [{kind:'daily' as const,hours:24},{kind:'intraday' as const,days:2},{kind:'intraday' as const,start_date:'2026-10-01',hours:24},{kind:'intraday' as const,start_datetime:'2026-10-01T00:00:00Z'},{kind:'intraday' as const,hours:24,start_datetime:'2026-10-01T00:00:00Z',end_datetime:'2026-10-02T00:00:00Z'}]) await expect(measurements(session,args.kind,args)).rejects.toThrow('INVALID_RANGE');
   expect(mock).not.toHaveBeenCalled();
   const empty=await measurements(session,'intraday',{hours:48});expect(empty.status).toBe('no_data');expect(empty.next_request).toBeNull();expect(empty.records).toEqual([]);expect(empty.available_metrics).toEqual([]);
  }finally{mock.mockRestore();}
 });
});

// The catalog describes the full range even when the caller requests one metric/page.
it('returns available metrics beyond the selected fields and page',async()=>{
 const mock=vi.spyOn(soxai,'data').mockResolvedValue([
  {uid:'owner',_time:'2026-10-01T00:00:00Z',activity_steps:0,health_hrv:null},
  {uid:'owner',_time:'2026-10-02T00:00:00Z',activity_steps:10,health_hrv:20},
 ]);
 try{
  const result=await measurements(session,'daily',{start_date:'2026-10-01',end_date:'2026-10-02',metrics:['activity_steps'],limit:1});
  expect(result.records).toEqual([{date:'2026-10-01',activity_steps:0}]);
  expect(result.available_metrics).toMatchObject([{name:'activity_steps',unit:'step',numeric_observations:2,missing_observations:0},{name:'health_hrv',unit:null,numeric_observations:1,missing_observations:1}]);
 }finally{mock.mockRestore();}
});

it('uses kind-specific definitions, preserves categorical values and marks partial days',async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-02T12:00:00Z'));
 const mock=vi.spyOn(soxai,'data').mockResolvedValue([{uid:'owner',_time:'2026-10-02T11:00:00Z',activity_steps:0,sleep_stage:3,health_hrv:10}]);
 try{
  const result=await measurements(session,'intraday',{hours:24});
  expect(result.available_metrics).toMatchObject([{name:'activity_steps',unit:'count'},{name:'health_hrv',unit:'ms'},{name:'sleep_stage',unit:'category'}]);
  expect(result.available_metrics[2].description).toContain('undetermined');
  expect(result.coverage).toMatchObject({expected_days:null,missing_dates:null,includes_today:true});
  expect(result.records[0].sleep_stage).toBe(3);
 }finally{mock.mockRestore();vi.useRealTimers();}
});
