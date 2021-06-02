// This is the BrainClub compiler.
// This file is not part of Vonkeror.
// You must run this file in the JavaScript shell.
//
// Licensed by GNU GPL version 3 or later version

version(180);


//==== variables

var strings;
var codes;
var defines;
var pstack;
var outputbfc;


//==== some functions

String.prototype.repeat=function(x)(Array(x+1).join(this));

function optimize_brainfuck(code) {
    var code1;
    var inp="";
    var s;
    var s1;
    var c1;
    //check for !
    s=code.search("!");
    if(s!=-1) {
        inp=code.substr(s+1);
        code=code.substr(0,s);
    }
    //first remove everything other than ,.<>-+[]*~
    code=code.replace(/[^,.<>\-+\[\]*~]/g,"");
    //remove 256 - or 256 + sign
    code=code.replace(/(\-{256}|\+{256})/g,"");
    //move * before <~>
    do {
        code1=code;
        code=code.replace(/([<~>]+)\*/g,"*$1");
    } while(code!=code1);
    //look if commands cancel each other out
    do {
        code1=code;
        code=code.replace(/(\-\+|\+\-|\<\>|\>\<|\~\~|\*\*)*/g,"");
    } while(code!=code1);
    //look for [ after ]
    while((s=code.search(/\]\[/))!=-1) {
        s1=1+ ++s;
        c1=1;
        while(c1) {
            if(code[s1]=='[') ++c1;
            if(code[s1]==']') --c1;
            ++s1;
        }
        code=code.substr(0,s)+code.substr(s1);
    }
    //finished
    if(!inp) return code;
    return code+"!"+inp;
}

function lpstack(x) {
    if(x) {
        pstack[pstack.length-1].push(x);
        pstack.push(x);
        return pstack[pstack.length-2];
    } else {
        return pstack[pstack.length-1];
    }
}

function do_codes(c) {
    var ps;
    var x;
    var y;
    var i;
    var wh;
    if(pstack.length==1 && c==";" && lpstack().is_colon) {
        lpstack().is_colon=false;
        c=");";
    }
    label1: if(pstack.length) {
        if(c[0]=="`") {
            c=c.substr(1);
            break label1;
        } else if(c.substr(0,2)=="$#") {
            lpstack().push("$"+c.substr(2));
        } else if(c.substr(0,2)=="$`" || c.substr(0,2)=="$:" || c.substr(0,2)=="$;") {
            lpstack().push(c.substr(1));
        } else if(lpstack().is_colon) {
            lpstack().push(c);
        } else if(c=="(") {
            lpstack([]);
        } else if(c[0]==")") {
            lpstack().command=c;
            if(pstack.length==1) {
                c=lpstack();
                pstack.pop();
                break label1;
            } else {
                pstack.pop();
            }
        } else if(c.substr(0,2)=="$%") {
            lpstack().push("$"+c.substr(2));
        } else if(c.substr(0,2)=="$(" || c.substr(0,2)=="$)") {
            lpstack().push(c.substr(1));
        } else {
            lpstack().push(c);
        }
        return;
    }
    if(c instanceof Array) {
        ps=c;
        c=c.command;
    }
    if((c[0]=="#" || c[1]=="#") && !defines['+'+c]) {
        i=c.substr(2).search("#")+3;
        wh=c.substr(i);
        c=c.substr(0,i);
    }
    if(c[0]=="{") {
        outputbfc+=c.substr(1);
    } else if(c==")" || defines['+'+c]) {
        if(c==")") c=ps; else c=defines['+'+c];
        for(i=0;i<c.length;i++) {
            x=c[i];
            if(x instanceof Array && x.command.substr(0,3)==")$$") {
                do_codes({command:")"+x.command.substr(2),__proto__:x});
            } else if(x instanceof Array && x.command.substr(0,2)=="$=") {
                do_codes({command:")"+defines['-'+x.substr(2)],__proto__:x});
            } else if(x instanceof Array && x.command.substr(0,2)==")$" && Number(x.substr(2))) {
                y=x.command.substr(2);
                do_codes({command:")"+ps[Number(y)-1],__proto__:x});
            } else if(x.substr && x.substr(0,3)==")$$") {
                do_codes(")"+x.substr(2));
            } else if(x.substr && x.substr(0,3)==")$=") {
                do_codes(")"+String(defines['-'+x.substr(3)]));
            } else if(x.substr && x.substr(0,2)==")$" && Number(x.substr(2))) {
                y=x.substr(2);
                if(!ps[Number(y)-1]) throw "Requesting "+x+" but only "+ps.length+" available";
                do_codes(")"+ps[Number(y)-1]);
            } else if(x.substr && x.substr(0,2)=="$$") {
                do_codes(x.substr(1));
            } else if(x.substr && x.substr(0,2)=="$=") {
                do_codes(String(defines['-'+x.substr(2)]));
            } else if(x=="$*") {
                do_codes({command:")",__proto__:ps});
            } else if(x.substr && x.substr(0,1)=="$" && Number(x.substr(1))) {
                y=x.substr(1);
                if(!ps[Number(y)-1]) throw "Requesting "+x+" but only "+ps.length+" available";
                do_codes(ps[Number(y)-1]);
            } else {
                do_codes(x);
            }
        }
    } else {
        switch(c) {
            case "":
                break;
            case ":":
                x=[];
                x.is_colon=true;
                pstack.push(x);
                break;
            case "(":
                pstack.push([]);
                break;
            case ");":
                defines['+'+ps[0]]=ps.slice(1);
                break;
            case ")#ADD#":
                defines['-'+ps[0]]+=Number(ps[1]);
                break;
            case "#BFC#":
                outputbfc+=strings[Number(wh)];
                break;
            case "#DEBUG#":
                print(pstack.toSource());
                print(defines.toSource());
                break;
            case ")#EACH#":
                for(i=0;i<ps.length;i++) do_codes({command:")"+wh,__proto__:[]});
                break;
            case ")#SET#":
                defines['-'+ps[0]]=Number(ps[1]);
                break;
            case "#STOP#":
                throw optimize_brainfuck(outputbfc);
                break;
            case ")#STRING#":
                x=strings[Number(ps[0])];
                for(i=0;i<x.length;i++) do_codes({command:")"+wh,__proto__:[String(x.charCodeAt(i))]});
                break;
            default:
                if(c[0]==")" && !isNaN(x=Number(c.substr(1)))) {
                    for(i=0;i<x;i++) do_codes({command:")",__proto__:ps});
                } else if(!isNaN(x=Number(c))) {
                    y=[c];
                    y.command=")#NUM#";
                    do_codes(y);
                } else {
                    throw "Invalid command: "+c+" "+wh;
                }
        }
    }
}


//==== read the file

const Cc=Components.classes;
const Ci=Components.interfaces;

if(!arguments[0]) quit();
var data="";
var i;
var x;

for(i=0;i<arguments.length;i++) {
    var file=Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties).get("CurWorkD",Ci.nsIFile);
    file.append(arguments[i]);
    var stream1=Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
    var stream=Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream);
    stream1.init(file,0x01,null,null);
    stream.init(stream1);
    data+=stream.read(stream.available())+"\n";
    stream.close();
    stream1.close();
}


//==== put the codes and strings in array

outputbfc="";
strings=[];
data=data.replace(/([^\s"]*)"([^"]*)"/g,function(xx,y,x) {
    strings.push(x);
    return " ( "+(strings.length-1)+" )#STR#"+y+" ";
});
data=data.replace(/\\[^\f\r\n]*\r?\n/g,"");
data=data.replace(/\{([^{}]*)\}/g,function(xx,x) {
    strings.push(x);
    return "#BFC#"+(strings.length-1);
});
codes=data.split(/\s+/);
defines={};
pstack=[];

try {
    for(i=0;i<codes.length;i++) do_codes(codes[i]);
    dump(optimize_brainfuck(outputbfc));
} catch(e) {
    print(e);
}
