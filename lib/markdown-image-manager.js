'use babel';
import { CompositeDisposable } from 'atom';
clipboard = require ('clipboard');
fs = require ('fs');

export default {

  modalPanel: null,
  subscriptions: null,
  projectRootDir:null,
  subfolder_name:null,
  sub_path:null,
  full_path:null,
  cursor:null,
  //路径分隔符.linux是"/" windows是"\\"
  sep:null,

  //插件激活时执行该方法
  activate(state) {

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();
    cursor = atom.workspace.getActiveTextEditor();


    // 注册快捷键
    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'markdown-image-manager:paste': () => this.paste()
    }));
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'markdown-image-manager:delImage': () => this.delImage()
    }));

    this.init()
  },

  //插件失效时，执行该方法
  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
  },

  serialize() {
    return {
    };
  },
  init(){

    var opsys = process.platform;
    if (opsys == "darwin") {
      opsys = "MacOS";
    } else if (opsys == "win32" || opsys == "win64") {
      opsys = "Windows";
      this.sep="\\" 
    } else if (opsys == "linux") {
      opsys = "Linux";
      this.sep="/"
    }

    //获得图片的保持路径
    subfolder_name=atom.config.get ('markdown-image-manager.subfolder');

    var path=[]
    path.push(atom.project.getDirectories()[0].path)

    path.push(subfolder_name)

    //通过制定的分割符连接给数组的元素
    projectRootDir=path.join(this.sep)
    console.log("projectRootDir: "+projectRootDir);

  },
  
  paste(){
    
    
    console.log('MarkdownImageManager was pase!');
    text = clipboard.readText()
    if(text){
      console.log('MarkdownImageManager paste was text!');
      editor = atom.workspace.getActiveTextEditor()
      editor.insertText(text)
      return
    }

    //只在markdown的文件中起作用
    cursor = atom.workspace.getActiveTextEditor();
    if(cursor.getPath().substr(-3)!='.md' && cursor.getPath().substr(-9) != '.markdown'){
      console.log('MarkdownImageManager text was not md!');
       return
    }

    var image_name = new Date().format("yyyy-MM-dd_hh-mm-ss");

    //子路径，/assets/image_name.png
    sub_path="/"+subfolder_name+"/"+image_name+".png"

    var text =""
	  text+= '![' + image_name + ']('
    text += sub_path+ ') '

    //全路径
    full_path=""
    full_path=projectRootDir+this.sep+image_name+".png";

    // clipboard扩展读取粘贴板图片内容
      img = clipboard.readImage()
    // 空内容处理
    if (img.isEmpty()){
      if (atom.config.get('markdown-image-manager.infoalertenable')){
        atom.notifications.addError(message = '快速贴图失败', {detail:'粘贴板为空'})
        return
      }
    }

    if(!fs.existsSync(projectRootDir)){
      fs.mkdirSync(projectRootDir)
    }
    fs.writeFileSync (full_path, img.toPNG())
    console.log('insertText: '+text);
    cursor.insertText(text);
    atom.notifications.addSuccess(message = "快速贴图成功", {detail:'文件促存放路径:' + full_path})
  },

  delImage(){
    console.log('MarkdownImageManager was delImage!');
    cursor = atom.workspace.getActiveTextEditor();
    if(cursor.getPath().substr(-3)!='.md' && cursor.getPath().substr(-9) != '.markdown'){
      console.log('MarkdownImageManager text was not md!');
      //执行原来的操作
      cursor.deleteToEndOfWord()
       return
    }

    //选中当前行的内容
    var selectedToDelImg = cursor.lineTextForBufferRow(cursor.getCursorBufferPosition().row)
    // 删掉当光标所在行的空白字符
    selectedToDelImg = selectedToDelImg.replace(/\s/g, "");
    var markdownImageLinkPattern = /!\[[0-9a-zA-Z-_]+\]\([0-9a-zA-Z-_/]+.png\)/
    if (!selectedToDelImg.match (markdownImageLinkPattern)){
        //当前在markdown文件中，但是光标所在行不是md链接
        cursor.deleteToEndOfWord()
        atom.notifications.addError(message = '删除失败', {detail:'原因:' + '没有匹配到图片的markdown标记'})
        return
    }

    //匹配文件名,包含后缀名
    var filenamePttern=/[0-9a-zA-Z-_]+.png/
    var image_name=selectedToDelImg.match(filenamePttern)[0]
    var full_path=projectRootDir+this.sep+image_name;


    // 检验文件存在与否
    if (!fs.existsSync(full_path)){
      if (atom.config.get ('markdown-image-manager.infoalertenable')){
         atom.notifications.addError(message = '删除失败', {detail:'文件不存在，其完整路径名:' + full_path })
      }
    }else {
      fs.unlink(full_path, (err) => {
        if (atom.config.get ('markdown-image-manager.infoalertenable')){
              if(err){
                atom.notifications.addError(message = '删除失败', {detail:'原因:' + err})
              }else {
                atom.notifications.addSuccess(message = '删除成功', {detail:'[' + full_path + ']已被删除'})
              }
          }
      });
    }

    //删除markdown标记
    console.log('MarkdownImageManager delImage detele markdown image mark');
    var text_buffer=cursor.getBuffer()
    var current_range=cursor.bufferRangeForBufferRow(cursor.getLastCursor().getBufferRow());
    text_buffer.scanInRange(markdownImageLinkPattern,current_range,"",replace_image_text)
  }

};

//移除image的markdown标记时的回掉函数
var replace_image_text=function(obj){
  obj.replace("")

}

// 时间格式化
Date.prototype.format = function(fmt) {
     var o = {
        "M+" : this.getMonth()+1,                 //月份
        "d+" : this.getDate(),                    //日
        "h+" : this.getHours(),                   //小时
        "m+" : this.getMinutes(),                 //分
        "s+" : this.getSeconds(),                 //秒
        "q+" : Math.floor((this.getMonth()+3)/3), //季度
        "S"  : this.getMilliseconds()             //毫秒
    };
    if(/(y+)/.test(fmt)) {
            fmt=fmt.replace(RegExp.$1, (this.getFullYear()+"").substr(4 - RegExp.$1.length));
    }
     for(var k in o) {
        if(new RegExp("("+ k +")").test(fmt)){
             fmt = fmt.replace(RegExp.$1, (RegExp.$1.length==1) ? (o[k]) : (("00"+ o[k]).substr((""+ o[k]).length)));
         }
     }
    return fmt;
}
