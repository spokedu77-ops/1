import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import SessionPage from '../app/spokedu-master/spomove/session/page';
import TeacherPage from '../app/teacher/spomove/page';
import AdminPage from '../app/admin/spomove/training/page';
import {MasterAccessProvider} from '../app/spokedu-master/access/MasterAccessProvider';
import {OFFICIAL_SPOMOVE_LIBRARY} from '../app/spokedu-master/spomove/officialSpomovePresets';
import {TEACHER_SPOMOVE_WEEKS,buildTeacherAutoLaunch} from '../app/teacher/spomove/teacherSpomoveCurriculum';
import * as clock from '../app/admin/spomove/training/_player/lib/runtimeClock';
import * as locks from '../app/admin/spomove/training/_player/lib/lockViewportScroll';
import {useMasterStore} from '../app/spokedu-master/store';
import './harness.css';
const w=window as any;w.auditNavigations=[];w.auditCatalog={official:OFFICIAL_SPOMOVE_LIBRARY,teacher:TEACHER_SPOMOVE_WEEKS.map(week=>({...week,programs:week.programs.map(p=>({...p,launch:buildTeacherAutoLaunch(p)}))}))};w.auditClock=clock;w.auditLocks=locks;w.auditStore=useMasterStore;
const root=createRoot(document.getElementById('root')!);w.auditUnmount=()=>root.render(<div data-audit-return>returned</div>);
const surface=new URLSearchParams(location.search).get('surface');
const snapshot:any={canUseSpomove:true,isAdmin:true,plan:'premium',subscriptionStatus:'active',canUseRecords:true,canUseLibrary:true};
root.render(surface==='teacher'?<TeacherPage/>:surface==='admin'?<AdminPage/>:<MasterAccessProvider snapshot={snapshot}><SessionPage/></MasterAccessProvider>);

