import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import * as CANNON from "https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js";

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x06070a);
scene.fog=new THREE.Fog(0x06070a,24,70);
const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.05,120);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xdce8ff,0x171820,2));
const sun=new THREE.DirectionalLight(0xffffff,3);sun.position.set(-8,15,8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);scene.add(sun);

const world=new CANNON.World({gravity:new CANNON.Vec3(0,-9.82,0)});
world.broadphase=new CANNON.SAPBroadphase(world);world.allowSleep=false;
world.defaultContactMaterial.friction=.65;world.defaultContactMaterial.restitution=.03;

const floorMat=new THREE.MeshStandardMaterial({color:0x171a20,roughness:.82});
const floor=new THREE.Mesh(new THREE.BoxGeometry(40,.4,40),floorMat);floor.position.y=-.2;floor.receiveShadow=true;scene.add(floor);
world.addBody(new CANNON.Body({mass:0,shape:new CANNON.Box(new CANNON.Vec3(20,.2,20)),position:new CANNON.Vec3(0,-.2,0)}));
const grid=new THREE.GridHelper(40,40,0x353941,0x181a20);grid.position.y=.012;scene.add(grid);

const arena=new THREE.Group();scene.add(arena);
function cylinder(a,b,r,mat,parent=arena){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A);const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length,12),mat);m.position.copy(A).add(B).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());m.castShadow=true;parent.add(m);return m}
const metal=new THREE.MeshStandardMaterial({color:0x707780,metalness:.85,roughness:.25});
const rubber=new THREE.MeshStandardMaterial({color:0x242831,roughness:.7});
const top=4.5;
cylinder([-3.5,0,-1.5],[-3.5,top,-1.5],.12,metal);cylinder([3.5,0,-1.5],[3.5,top,-1.5],.12,metal);cylinder([-3.5,top,-1.5],[3.5,top,-1.5],.065,metal);
const barBody=new CANNON.Body({mass:0,shape:new CANNON.Cylinder(.065,.065,7,16),position:new CANNON.Vec3(0,top,-1.5),quaternion:new CANNON.Quaternion()});
barBody.quaternion.setFromEuler(0,0,Math.PI/2);world.addBody(barBody);
const matAccent=new THREE.MeshStandardMaterial({color:0xdce0e7,roughness:.4});
const matDark=new THREE.MeshStandardMaterial({color:0x111318,roughness:.8});
const matSkin=new THREE.MeshStandardMaterial({color:0xd8dbe0,roughness:.5});
const matJoint=new THREE.MeshStandardMaterial({color:0x6d737d,metalness:.55,roughness:.35});

const parts={};const links=[];const joints=[];
function limbMesh(size,material){const g=new THREE.Group();const r=size[0];const len=size[1];const c=new THREE.Mesh(new THREE.CapsuleGeometry(r,len,5,10),material);c.rotation.z=0; c.castShadow=true;g.add(c);return g}
function part(name,pos,r,len,mass,material=matSkin){
 const body=new CANNON.Body({mass,shape:new CANNON.Cylinder(r,r,len,10),position:new CANNON.Vec3(...pos),linearDamping:.035,angularDamping:.12});
 body.quaternion.setFromEuler(0,0,0);world.addBody(body);
 const mesh=limbMesh([r,len],material);scene.add(mesh);
 const jointMesh=new THREE.Mesh(new THREE.SphereGeometry(r*1.15,12,8),matJoint);mesh.add(jointMesh);
 parts[name]={name,body,mesh,r,len};
 return parts[name]
}
function torso(name,pos,size,mass){
 const body=new CANNON.Body({mass,shape:new CANNON.Box(new CANNON.Vec3(size[0]/2,size[1]/2,size[2]/2)),position:new CANNON.Vec3(...pos),linearDamping:.035,angularDamping:.12});world.addBody(body);
 const mesh=new THREE.Mesh(new THREE.CapsuleGeometry(size[0]*.5,size[1]*.72,6,12),matSkin);mesh.scale.z=size[2]/(size[0]*2);mesh.castShadow=true;scene.add(mesh);
 parts[name]={name,body,mesh,r:size[0]/2,len:size[1]};return parts[name]
}
const startZ=1.3;
torso("hips",[0,2.25,startZ],[.52,.42,.34],7);
torso("chest",[0,2.82,startZ],[.62,.72,.38],6);
part("head",[0,3.55,startZ],.23,.30,2.5,matSkin);
part("lUpper",[-.53,2.85,startZ],.13,.62,2.2);part("rUpper",[.53,2.85,startZ],.13,.62,2.2);
part("lFore",[-.62,2.30,startZ],.11,.55,1.4);part("rFore",[.62,2.30,startZ],.11,.55,1.4);
part("lHand",[-.64,1.93,startZ],.105,.22,.8,matAccent);part("rHand",[.64,1.93,startZ],.105,.22,.8,matAccent);
part("lThigh",[-.22,1.68,startZ],.16,.78,3.8);part("rThigh",[.22,1.68,startZ],.16,.78,3.8);
part("lShin",[-.22,.85,startZ],.125,.78,2.8);part("rShin",[.22,.85,startZ],.125,.78,2.8);
part("lFoot",[-.22,.35,startZ+.08],.12,.32,1.2,matAccent);part("rFoot",[.22,.35,startZ+.08],.12,.32,1.2,matAccent);

function constraint(a,b,pA,pB,angle=Math.PI*.65){
 const j=new CANNON.ConeTwistConstraint(parts[a].body,parts[b].body,{pivotA:new CANNON.Vec3(...pA),pivotB:new CANNON.Vec3(...pB),axisA:new CANNON.Vec3(0,1,0),axisB:new CANNON.Vec3(0,1,0),angle,twistAngle:angle});
 world.addConstraint(j);joints.push(j)
}
constraint("hips","chest",[0,.2,0],[0,-.34,0],.55);
constraint("chest","head",[0,.36,0],[0,-.17,0],.35);
constraint("hips","lThigh",[-.19,-.15,0],[0,.39,0],.5);constraint("hips","rThigh",[.19,-.15,0],[0,.39,0],.5);
constraint("lThigh","lShin",[0,-.39,0],[0,.39,0],.25);constraint("rThigh","rShin",[0,-.39,0],[0,.39,0],.25);
constraint("chest","lUpper",[-.28,.2,0],[0,.31,0],.65);constraint("chest","rUpper",[.28,.2,0],[0,.31,0],.65);
constraint("lUpper","lFore",[0,-.30,0],[0,.27,0],.45);constraint("rUpper","rFore",[0,-.30,0],[0,.27,0],.45);
constraint("lFore","lHand",[0,-.27,0],[0,.11,0],.55);constraint("rFore","rHand",[0,-.27,0],[0,.11,0],.55);
constraint("lShin","lFoot",[0,-.39,0],[0,.16,0],.45);constraint("rShin","rFoot",[0,-.39,0],[0,.16,0],.45);

const bones=[["hips","chest"],["chest","head"],["chest","lUpper"],["lUpper","lFore"],["lFore","lHand"],["chest","rUpper"],["rUpper","rFore"],["rFore","rHand"],["hips","lThigh"],["lThigh","lShin"],["lShin","lFoot"],["hips","rThigh"],["rThigh","rShin"],["rShin","rFoot"]];
for(const [a,b] of bones){const line=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0x3b4049,transparent:true,opacity:.55}));scene.add(line);links.push([line,parts[a],parts[b]])}

let mode="bar",attached=false,paused=false,timeScale=1,wasGrounded=false,last=performance.now();const keys={};
addEventListener("keydown",e=>{keys[e.code]=true;if(e.code==="KeyP")paused=!paused;if(e.code==="KeyR")reset();if(e.code==="Space")e.preventDefault()});
addEventListener("keyup",e=>keys[e.code]=false);
function toast(t){const x=document.getElementById("toast");x.textContent=t;x.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>x.classList.remove("show"),500)}
function setMode(m){mode=m;document.getElementById("modeLabel").textContent=m==="bar"?"HIGH BAR":"TUMBLING";document.querySelectorAll("[data-mode]").forEach(b=>b.classList.toggle("active",b.dataset.mode===m));reset();toast(m==="bar"?"HIGH BAR":"TUMBLING")}
function reset(){
 const p={hips:[0,2.25,startZ],chest:[0,2.82,startZ],head:[0,3.55,startZ],lUpper:[-.53,2.85,startZ],rUpper:[.53,2.85,startZ],lFore:[-.62,2.30,startZ],rFore:[.62,2.30,startZ],lHand:[-.64,1.93,startZ],rHand:[.64,1.93,startZ],lThigh:[-.22,1.68,startZ],rThigh:[.22,1.68,startZ],lShin:[-.22,.85,startZ],rShin:[.22,.85,startZ],lFoot:[-.22,.35,startZ+.08],rFoot:[.22,.35,startZ+.08]};
 for(const n in p){const b=parts[n].body;b.position.set(...p[n]);b.velocity.setZero();b.angularVelocity.setZero();b.quaternion.set(0,0,0,1)}
 attached=false;toast("RESET")
}
function nearBar(){const a=parts.lHand.body.position,b=parts.rHand.body.position;const dl=Math.hypot(a.x,a.y-top,a.z+1.5),dr=Math.hypot(b.x,b.y-top,b.z+1.5);return dl<.65&&dr<.65}
function grab(){if(mode==="bar"&&!attached&&nearBar()){attached=true;parts.lHand.body.velocity.setZero();parts.rHand.body.velocity.setZero();toast("GRAB")}}
function release(){if(attached){attached=false;toast("RELEASE")}}

function motor(dt){
 const h=parts.hips.body,c=parts.chest.body;
 const tuck=(keys.KeyW?1:0)-(keys.KeyS?1:0);
 const twist=(keys.KeyD?1:0)-(keys.KeyA?1:0);
 const roll=(keys.KeyQ?1:0)-(keys.KeyE?1:0);
 if(tuck){const s=tuck*58;for(const n of ["lThigh","rThigh"])parts[n].body.torque.x+=s;for(const n of ["lShin","rShin"])parts[n].body.torque.x-=s*.65;c.torque.x+=s*.28}
 if(twist){h.torque.y+=twist*38;c.torque.y+=twist*25}
 if(roll){h.torque.z+=roll*28;c.torque.z+=roll*18}
 if(keys.ShiftLeft||keys.ShiftRight){const f=new CANNON.Vec3((keys.KeyD?1:0)-(keys.KeyA?1:0),0,(keys.KeyW?-1:0)+(keys.KeyS?1:0));h.applyForce(f.scale(25),h.position)}
 if(attached){
   const target=new CANNON.Vec3(0,top-.95,-1.5),d=target.vsub(h.position);
   h.force.vadd(d.scale(90),h.force);h.force.vsub(h.velocity.scale(14),h.force);
   c.force.vadd(d.scale(25),c.force);
   const swing=(h.velocity.x*8);h.torque.z+=swing;
 }else if(mode==="tumble"&&keys.Space){h.force.y+=32}
 if(mode==="bar"&&keys.Space){if(attached)release();else grab();keys.Space=false}
}
function updateVisual(){
 for(const n in parts){const p=parts[n];p.mesh.position.set(p.body.position.x,p.body.position.y,p.body.position.z);p.mesh.quaternion.set(p.body.quaternion.x,p.body.quaternion.y,p.body.quaternion.z,p.body.quaternion.w)}
 for(const [l,a,b] of links)l.geometry.setFromPoints([a.mesh.position,b.mesh.position])
}
function hud(){
 const h=parts.hips.body,sp=h.velocity.length(),rot=h.angularVelocity.length();
 const grounded=h.position.y<.72&&!attached;
 let state=attached?"BAR GRIP":grounded?"GROUNDED":"AIRBORNE";
 document.getElementById("state").textContent=state;document.getElementById("speed").textContent=sp.toFixed(1)+" m/s";document.getElementById("spin").textContent=(rot*57.3).toFixed(0)+"°/s";
 document.getElementById("flight").style.transform="scaleX("+Math.min(1,Math.max(.05,h.position.y/5))+")";
 document.getElementById("power").style.transform="scaleX("+Math.min(1,sp/12)+")";
 document.getElementById("grip").style.transform="scaleX("+(attached?1:nearBar()?.8:.08)+")";
 if(grounded&&!wasGrounded)toast("LANDING");
 wasGrounded=grounded
}
function cameraFollow(dt){
 const p=parts.hips.mesh.position,target=new THREE.Vector3(p.x,p.y+.5,p.z);
 const desired=new THREE.Vector3(p.x+5.8,p.y+2.4,p.z+6.5);
 camera.position.lerp(desired,1-Math.pow(.0008,dt));camera.lookAt(target)
}
document.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
document.getElementById("reset").onclick=reset;
document.getElementById("slow").onclick=()=>{timeScale=timeScale===1?.5:1;document.getElementById("slow").textContent=timeScale===1?"0.5×":"1×"};
reset();
function loop(now){requestAnimationFrame(loop);const dt=Math.min(.033,(now-last)/1000);last=now;if(!paused){motor(dt);world.step(1/120,dt*timeScale,6)}updateVisual();hud();cameraFollow(dt);renderer.render(scene,camera)}
loop(performance.now());
addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
