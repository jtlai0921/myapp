
function tt(REDdata, IRdata){
	
	//RED 紅光的資料處理
	var REDd=0;
    var REDpxmax=0;
    var REDpymax=0;
    var REDpxmin=0;
    var REDpymin=65535;
    var REDplv=250;	//was 250
    var REDdr=1;
    var REDaxmax=[];
	var REDaymax=[];
	var REDaxmin=[];
	var REDaymin=[];
	for(i=0;i<REDdata.length;i++){
		REDp=REDdata[i];
		if(REDdr==1){	//找波峰
			if(REDp>REDpymax){
				REDpymax = REDp;
				REDpxmax = i;
			}else{
				REDd=REDpymax-REDp;
				if(REDd > REDplv){
					REDaxmax.push(REDpxmax);
					REDaymax.push(REDpymax);
					REDpymin = REDpymax;
					REDdr=0;
				}
			}
		}else{			//找波谷
			if(REDp<REDpymin){
				REDpymin = REDp;
				REDpxmin = i;
			}else{
				var REDd=REDp-REDpymin;
				if(REDd > REDplv){
					REDaxmin.push(REDpxmin);
					REDaymin.push(REDpymin);
					REDpymax = REDpymin;
					REDdr=1;
				}
			}
		}
	}
	
	
	//IR 紅外線的資料處理
	//alert("IRdata "+IRdata);
	var IRd=0;
    var IRpxmax=0;
    var IRpymax=0;
    var IRpxmin=0;
    var IRpymin=65535;
    var IRplv=330;	//was 250
    var IRdr=1;
    var IRaxmax=[];	//IR峰x
	var IRaymax=[];	//IR峰y
	var IRaxmin=[];	//IR谷x	
	var IRaymin=[];	//IR谷y
	for(i=0;i<IRdata.length;i++){
		IRp=IRdata[i];
		if(IRdr==1){	//找波峰
			if(IRp>IRpymax){
				//alert("IRp "+IRp);
				IRpymax = IRp;
				IRpxmax = i;
			}else{
				IRd=IRpymax-IRp;
				if(IRd > IRplv){
					IRaxmax.push(IRpxmax);
					IRaymax.push(IRpymax);
					IRpymin = IRpymax;
					IRdr=0;
				}
			}
		}else{			//找波谷
			if(IRp<IRpymin){
				IRpymin = IRp;
				IRpxmin = i;
			}else{
				var IRd=IRp-IRpymin;
				if(IRd > IRplv){
					IRaxmin.push(IRpxmin);
					IRaymin.push(IRpymin);
					IRpymax = IRpymin;
					IRdr=1;
				}
			}
		}
	}

	//Calculation 演算法
	var t=0;
    var DrawIRdata=new Uint32Array(200);
    var OutIRdata=new Uint32Array(200);
    var filterDrawIRdata=new Uint32Array(200);
    var RRRaverage=0;
    var IIIaverage=0;
    var SpO2=[];
	
	for(i=0;i<IRaxmax.length-1;i++){ //loop所有峰值x,週期數=峰數-1
		for(j=IRaxmax[t];j<=IRaxmax[t+1];j++){
			DrawIRdata[j] = IRdata[j];  //copy一份給畫圖用的數值
            IIIaverage += IRdata[j];    //算IR平均先將IR加總
            RRRaverage += REDdata[j];   //算RED平均先將RED加總
		}
		IRmaxd = IRaxmax[t+1] - IRaxmax[t];  //峰與峰之間的長度(經過資料點的數量)
		if(IRmaxd==0){IRmaxd=1;}  //防bug
        IIIaverage /= IRmaxd; //取得IR的實際平均值
        RRRaverage /= IRmaxd; //取得RED的實際平均值
		IRaverage = IIIaverage - IRdata[IRaxmin[t]];   //去掉波谷值(最低點),這樣數值會變小
        REDaverage = RRRaverage - REDdata[IRaxmin[t]];   
		IRamplitude = IRdata[IRaxmax[t]] - IRdata[IRaxmin[t]];    //取週期內的振幅(最高y-最低y)
        REDamplitude = REDdata[IRaxmax[t]] - REDdata[IRaxmin[t]];  //
		if(IRamplitude <= 0){IRamplitude=1;} //#防bug
        if(IRaverage <= 0){IRaverage=1;}
        if(REDamplitude <= 0){REDamplitude=1;}
        if(REDaverage <= 0){REDaverage=1;}        
		SpO2R = (REDamplitude / REDaverage) / (IRamplitude / IRaverage); //算SPO2公式
		newSpO2 = -45.06*SpO2R*SpO2R/100 + 30.354*SpO2R/10 + 94.845 ;    //33.354
		SpO2.push(newSpO2);	//紀錄這個週期算出來的SPO2
		t=t+1;  //到下一個週期
		IIIaverage=0; //IR平均值歸零
		RRRaverage=0; //RED平均值歸零
	}
	
	//PPG 脈搏
	var dx=[];
	
	for(i=0;i<(IRaxmax.length)-1;i++){
		//alert(IRaxmax[i+1]-IRaxmax[i]);
		dx.push(IRaxmax[i+1]-IRaxmax[i]);	//峰之間的距離記錄在dx裡
	}
	var sumdx = dx.reduce(function(a, b) { return a + b; }, 0);	//這個是找sumdx所有距離的加總
	if(sumdx==0){
		sumdx=1;
	}
	
	var lendx = dx.length;	//總共有幾個距離值
	if(lendx==0){
		lendx = 1;
	}
	
	var PPG = Math.round((60*50 / (sumdx/lendx)));	//sum/len=平均脈搏
	
	if(PPG==3000){
		PPG=0;
	}
	
	//SpO2 血氧值
	var sumSpO2 = SpO2.reduce(function(a, b) { return a + b; }, 0);	// 型同 var sumSpO2 = sum(SpO2);
	if(sumSpO2==0){
		sumSpO2=1;
	}
	var lenSpO2 = SpO2.length;
	if(lenSpO2==0){
		lenSpO2=1;
	}
	var outSpO2 = sumSpO2/lenSpO2;
	outSpO2 = Math.round(outSpO2 * 10) / 10;
	if(PPG==3000){
		outSpO2=0;
	}
	if(outSpO2>100){
		outSpO2=100;
	}
	//IRdata.includes(0)
	//count the number of 0s in the array, if it is >100, then there is no finger
	//if  0<x<100, means that there is a finger and we ask user to wait while we gather enoough data 
	
	
	var zeros = IRdata.filter(i => i === 0).length;
	
	if(zeros==200){
		document.getElementById('PPGhtml').innerHTML = "未偵測到手指..."; 
		document.getElementById("SPO2html").innerHTML=""; 
	}
	//if((zeros>0 && zeros<200) && (PPG<10 || PPG>150 || outSpO2<50)){
	if((zeros>0 && zeros<200)){
		document.getElementById('PPGhtml').innerHTML = "檢測中..."; 
		document.getElementById("SPO2html").innerHTML= "請稍等..."; 
	}
	if(zeros==0  && PPG>10 && PPG<150 && outSpO2>50){
		document.getElementById('PPGhtml').innerHTML = "心率：" + PPG + "下/分鐘"; 
		document.getElementById("SPO2html").innerHTML="血氧量：" + outSpO2 + "%"; 
		document.getElementById("hr").innerHTML=PPG;
		document.getElementById("spo2").innerHTML=outSpO2;
	}
}
