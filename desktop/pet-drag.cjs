// All coordinates come from Electron's screen API (DIP). Never feed window-relative
// renderer pointer events back into window positioning while the window is moving.
class PetDrag {
  constructor(cursor){this.cursor=cursor;this.session=null;}
  start(win,anchor){const bounds=win.getBounds();const cursor=anchor?{x:bounds.x+anchor.x,y:bounds.y+anchor.y}:this.cursor();this.session={win,cursor,bounds,moved:false};}
  update(){const s=this.session;if(!s||s.win.isDestroyed())return;const p=this.cursor(),dx=p.x-s.cursor.x,dy=p.y-s.cursor.y;
    if(!s.moved&&Math.hypot(dx,dy)<5)return;s.moved=true;
    const x=Math.round(s.bounds.x+dx),y=Math.round(s.bounds.y+dy),b=s.win.getBounds();
    if(b.x!==x||b.y!==y)s.win.setPosition(x,y,false);
  }
  end(){this.update();const moved=!!this.session?.moved;this.session=null;return moved;}
}
module.exports={PetDrag};
