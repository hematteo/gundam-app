import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderResolution} from './render-quality.js';

test('standard previews are supersampled and Retina changes increase real pixels',()=>{
  const preview=renderResolution({width:1280,height:720,dpr:1});
  assert.equal(preview.pixelWidth,2560);assert.equal(preview.pixelHeight,1440);
  const retina=renderResolution({width:1280,height:720,dpr:2});
  assert.equal(retina.pixelWidth,3200);assert.equal(retina.pixelHeight,1800);
  assert.ok(retina.pixelWidth>preview.pixelWidth);
});

test('a dense phone retains sharp rendering inside its smaller pixel budget',()=>{
  const phone=renderResolution({width:390,height:844,dpr:3,compact:true});
  assert.equal(phone.pixelWidth,975);assert.equal(phone.pixelHeight,2110);
  assert.ok(phone.pixelWidth*phone.pixelHeight<=4_000_000);
});

test('large windows and high DPI never exceed the pixel budget or GPU dimensions',()=>{
  for(const compact of [true,false])for(const width of [320,1920,3840,7680])for(const height of [720,2160,4320])for(const dpr of [1,2,4]){
    const result=renderResolution({width,height,dpr,compact,maxDimension:4096});
    assert.ok(result.pixelWidth>0&&result.pixelHeight>0);
    assert.ok(result.pixelWidth<=4096&&result.pixelHeight<=4096);
    assert.ok(result.pixelWidth*result.pixelHeight<=(compact?4_000_000:12_000_000));
  }
});
