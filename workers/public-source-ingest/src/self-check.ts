import assert from "node:assert/strict";
import { parseDaeguTodayAssemblyList, toPublicOccurrencePayload } from "./daegu.ts";
import { parseGangwonTodayAssemblyList, toGangwonPublicOccurrencePayload } from "./gangwon.ts";
import { parseBusanTodayAssemblyList, toBusanPublicOccurrencePayload } from "./busan.ts";
import { parseGyeonggiSouthTodayAssemblyList, toGyeonggiSouthPublicOccurrencePayload } from "./gyeonggi-south.ts";
import { parseGwangjuTodayAssemblyList, toGwangjuPublicOccurrencePayload } from "./gwangju.ts";
import { parseIncheonTodayAssemblyList, toIncheonPublicOccurrencePayload } from "./incheon.ts";
import { parseGyeongbukTodayAssemblyList, toGyeongbukPublicOccurrencePayload } from "./gyeongbuk.ts";
import { parseGyeongnamTodayAssemblyList, toGyeongnamPublicOccurrencePayload } from "./gyeongnam.ts";
import { parseJejuTodayAssemblyList, toJejuPublicOccurrencePayload } from "./jeju.ts";
import { parseChungbukTodayAssemblyList, toChungbukPublicOccurrencePayload } from "./chungbuk.ts";
import { parseChungnamTodayAssemblyList, toChungnamPublicOccurrencePayload } from "./chungnam.ts";
import { parseJeonbukTodayAssemblyList, toJeonbukPublicOccurrencePayload } from "./jeonbuk.ts";
import { parseJeonnamTodayAssemblyList, toJeonnamPublicOccurrencePayload } from "./jeonnam.ts";
import { parseDaejeonTodayAssemblyList, toDaejeonPublicOccurrencePayload } from "./daejeon.ts";
import { parseUlsanTodayAssemblyList, toUlsanPublicOccurrencePayload } from "./ulsan.ts";
import { parseSeoulAssemblyControlList, toSeoulPublicOccurrencePayload } from "./seoul.ts";
import { parseSejongTodayAssemblyList, toSejongPublicOccurrencePayload } from "./sejong.ts";
import { parseGyeonggiNorthTodayAssemblyList, toGyeonggiNorthPublicOccurrencePayload } from "./gyeonggi-north.ts";
import { ingestablePublicAssemblySources, policeRegions, publicAssemblySources, sourceCoverageReport, sourceOperationalDiagnostics } from "./sources.ts";
import { fetchLawPayloads, lawOperationalDiagnostics, readLawRuntime } from "./laws.ts";
import { cleanNewsText, fetchNewsPayloads, newsOperationalDiagnostics, parsePublisherRss, readNewsRuntime } from "./news.ts";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const fixture = `
<tr>
  <td class="listnum">4226</td>
  <td class="ta_left"><a href="/dgpo/bbs/view.do?bbsId=d495f174&menuNo=104050000&amp;num=4263"><span class="">0707(화) 오늘의 집회</span></a></td>
  <td class="hidden-xs hidden-sm">정보상황계</td>
  <td class="hidden-xs hidden-sm">2026-07-06</td>
  <td class="hidden-xs hidden-sm">105</td>
  <td class="hidden-xs hidden-sm"><img src="/images/dgpo2020/bbs/file_icon.gif" alt="파일이 존재합니다." /></td>
</tr>
<tr>
  <td class="listnum">4224</td>
  <td class="ta_left"><a href="/dgpo/bbs/view.do?bbsId=d495f174&menuNo=104050000&amp;num=4261"><span class="">0704(토)~0705(일) 오늘의 집회</span></a></td>
  <td class="hidden-xs hidden-sm">정보상황계</td>
  <td class="hidden-xs hidden-sm">2026-07-03</td>
  <td class="hidden-xs hidden-sm">235</td>
  <td class="hidden-xs hidden-sm"><img src="/images/dgpo2020/bbs/file_icon.gif" alt="파일이 존재합니다." /></td>
</tr>`;

const rows = parseDaeguTodayAssemblyList(fixture);
assert.equal(rows.length, 2);
assert.equal(rows[0]?.sourceId, "4263");
assert.equal(rows[0]?.hasAttachment, true);

const todayPayload = toPublicOccurrencePayload(rows[0], new Date("2026-07-07T00:00:00.000+09:00"));
assert.equal(todayPayload.id, "occ_daegu_0707_public");
assert.equal(todayPayload.lifecycleState, "UPCOMING");
assert.equal(todayPayload.sourceProvenance, "government_or_police");
assert.equal(todayPayload.riskLevel, "low");
assert.equal(todayPayload.rawText.includes("sourceId=4263"), true);
assert.equal(todayPayload.rawText.includes("attachment=yes"), true);

const weekendPayload = toPublicOccurrencePayload(rows[1], new Date("2026-07-07T00:00:00.000+09:00"));
assert.equal(weekendPayload.id, "occ_daegu_0704_0705_public");
assert.equal(weekendPayload.startsAt, "2026-07-04T00:00:00.000+09:00");
assert.equal(weekendPayload.endsAt, "2026-07-05T23:59:59.000+09:00");
assert.equal(weekendPayload.lifecycleState, "ENDED");

const gangwonRows = parseGangwonTodayAssemblyList(`
<tr>
  <td class="p_c">247</td>
  <td><a href='/gw/sub02/sub02_05.jsp?groupNo=11026&amp;boardNo=2198&amp;amode=itemView&amp;category=&amp;cpage=1&amp;searchType=&amp;searchString=' >&#39;26.7.10.&#40;금&#41; 오늘의 주요집회</a>&nbsp;</td>
  <td class="p_c">&nbsp;<img src="/Board/skin/default/default//__magicdir__/image/disk.jpg" alt="&#39;26.7.10.&#40;금&#41; 오늘의 주요집회" /></td>
  <td class="p_c">정보상황계 </td>
  <td class="p_c">2026-07-09</td>
  <td class="p_c">3</td>
</tr>`);
assert.equal(gangwonRows.length, 1);
assert.equal(gangwonRows[0]?.sourceId, "2198");
assert.equal(gangwonRows[0]?.hasAttachment, true);
const gangwonPayload = toGangwonPublicOccurrencePayload(gangwonRows[0], new Date("2026-07-10T00:00:00.000+09:00"));
assert.equal(gangwonPayload.id, "occ_gangwon_2026_07_10_public");
assert.equal(gangwonPayload.areaClusterId, "area_gangwon");
assert.equal(gangwonPayload.lifecycleState, "UPCOMING");
assert.equal(gangwonPayload.rawText.includes("boardNo=2198"), true);

const busanRows = parseBusanTodayAssemblyList(`
<tr>
  <td class="o1_td_bt ">2383</td>
  <td class="o1_td_bt tdalign">
    <a href="#" onclick="javascript:linkPage(1,'view','114465');return false;">2026.7.4.&#40;토&#41;~5.&#40;일&#41; 주요집회</a>
  </td>
  <td class="o1_td_bt">정보과</td>
  <td class="o1_td_bt">2026-07-03</td>
  <td class="o1_td_bt"> </td>
  <td class="o1_td_bt"></td>
</tr>`);
assert.equal(busanRows.length, 1);
assert.equal(busanRows[0]?.sourceId, "114465");
const busanPayload = toBusanPublicOccurrencePayload(busanRows[0], new Date("2026-07-07T00:00:00.000+09:00"));
assert.equal(busanPayload.id, "occ_busan_2026_07_04_05_public");
assert.equal(busanPayload.areaClusterId, "area_busan");
assert.equal(busanPayload.endsAt, "2026-07-05T23:59:59.000+09:00");
assert.equal(busanPayload.lifecycleState, "ENDED");

const gyeonggiSouthRows = parseGyeonggiSouthTodayAssemblyList(`
<tr class="notice_line">
  <td>1705</td>
  <td class="sub_line">
    <a href="javascript:bbsView('1799');"> 7.10.&#40;금&#41; 주요 집회 </a>
  </td>
  <td>박재환</td>
  <td>2026-07-09</td>
  <td>19</td>
  <td><img src="/include/main/images/basic/add_file.jpg" alt="첨부파일"/></td>
</tr>`);
assert.equal(gyeonggiSouthRows.length, 1);
assert.equal(gyeonggiSouthRows[0]?.sourceId, "1799");
assert.equal(gyeonggiSouthRows[0]?.hasAttachment, true);
const gyeonggiSouthPayload = toGyeonggiSouthPublicOccurrencePayload(gyeonggiSouthRows[0], new Date("2026-07-10T00:00:00.000+09:00"));
assert.equal(gyeonggiSouthPayload.id, "occ_gyeonggi_south_2026_07_10_public");
assert.equal(gyeonggiSouthPayload.areaClusterId, "area_gyeonggi_south");
assert.equal(gyeonggiSouthPayload.lifecycleState, "UPCOMING");
assert.equal(gyeonggiSouthPayload.rawText.includes("contentSeq=1799"), true);
const gyeonggiSouthRangePayload = toGyeonggiSouthPublicOccurrencePayload(
  { ...gyeonggiSouthRows[0], sourceId: "1795", title: "7.4(토)~7.6(월) 주요 집회", postedAt: "2026-07-03" },
  new Date("2026-07-10T00:00:00.000+09:00")
);
assert.equal(gyeonggiSouthRangePayload.startsAt, "2026-07-04T00:00:00.000+09:00");
assert.equal(gyeonggiSouthRangePayload.endsAt, "2026-07-06T23:59:59.000+09:00");

const gwangjuRows = parseGwangjuTodayAssemblyList(`
<tr>
  <td class="listCenter" nowrap>685</td>
  <td class="listLeft" nowrap>
    <form name="subForm" method="post" action="/cop/bbs/selectBoardArticle.do">
      <input type="hidden" name="bbsId" value="BBSMSTR_000000000031" />
      <input type="hidden" name="nttId" value="58543" />
      <input type="hidden" name="bbsTyCode" value="BBST01" />
      <input type="hidden" name="bbsAttrbCode" value="BBSA03" />
      <input type="hidden" name="authFlag" value="Y" />
      <input name="pageIndex" type="hidden" value="1"/>
      <span class="link"><input type="submit" value="주간 집회상황&#40;7.6.∼7.12.&#41;" ></span>
    </form>
  </td>
  <td class="listCenter" nowrap>정보상황계</td>
  <td class="listCenter" nowrap>2026-07-03</td>
  <td class="listCenter" nowrap>45</td>
</tr>`);
assert.equal(gwangjuRows.length, 1);
assert.equal(gwangjuRows[0]?.sourceId, "58543");
const gwangjuPayload = toGwangjuPublicOccurrencePayload(gwangjuRows[0], new Date("2026-07-10T00:00:00.000+09:00"));
assert.equal(gwangjuPayload.id, "occ_gwangju_2026_07_06_12_public");
assert.equal(gwangjuPayload.areaClusterId, "area_gwangju");
assert.equal(gwangjuPayload.startsAt, "2026-07-06T00:00:00.000+09:00");
assert.equal(gwangjuPayload.endsAt, "2026-07-12T23:59:59.000+09:00");
assert.equal(gwangjuPayload.lifecycleState, "UPCOMING");
assert.equal(gwangjuPayload.rawText.includes("nttId=58543"), true);

const incheonRows = parseIncheonTodayAssemblyList(`
<tr>
  <td>670</td>
  <td class="sub_line">
    <a href="view.php?&bbs_code=ic015&bd_num=70131">오늘의 주요 집회&#40;7.8.수&#41;</a>
  </td>
  <td><span onclick="rg_bbs_layer('ic015','70131','집회담당자','jeongbo03','','','','',event)"> 집회담당자</span></td>
  <td>2026-07-07</td>
  <td>16</td>
</tr>`);
assert.equal(incheonRows.length, 1);
assert.equal(incheonRows[0]?.sourceId, "70131");
const incheonPayload = toIncheonPublicOccurrencePayload(incheonRows[0], new Date("2026-07-10T00:00:00.000+09:00"));
assert.equal(incheonPayload.id, "occ_incheon_2026_07_08_public");
assert.equal(incheonPayload.areaClusterId, "area_incheon");
assert.equal(incheonPayload.lifecycleState, "ENDED");
assert.equal(incheonPayload.rawText.includes("bd_num=70131"), true);

const gyeongbukRows = parseGyeongbukTodayAssemblyList(`
<tr>
  <td class="listnum">2362</td>
  <td class="t_left">
    <a href='/bbs/view.do?bbsId=8&amp;sid=gbpolice&amp;pageNum=1&amp;wr_id=2611'>오늘의 주요집회&#40;26년 7월 10일~12일&#41;</a>
    <img src='/images/bbs/bbs/icon_file.gif' class='middle' alt='file'/>
  </td>
  <td class="hidden-xs hidden-sm">정보관리계</td>
  <td class="hidden-xs hidden-sm">2026-07-09</td>
  <td class="hidden-xs hidden-sm">3</td>
</tr>`);
assert.equal(gyeongbukRows.length, 1);
assert.equal(gyeongbukRows[0]?.sourceId, "2611");
assert.equal(gyeongbukRows[0]?.hasAttachment, true);
const gyeongbukPayload = toGyeongbukPublicOccurrencePayload(gyeongbukRows[0], new Date("2026-07-10T00:00:00.000+09:00"));
assert.equal(gyeongbukPayload.id, "occ_gyeongbuk_2026_07_10_12_public");
assert.equal(gyeongbukPayload.areaClusterId, "area_gyeongbuk");
assert.equal(gyeongbukPayload.startsAt, "2026-07-10T00:00:00.000+09:00");
assert.equal(gyeongbukPayload.endsAt, "2026-07-12T23:59:59.000+09:00");
assert.equal(gyeongbukPayload.lifecycleState, "UPCOMING");
assert.equal(gyeongbukPayload.rawText.includes("wr_id=2611"), true);

const gyeongnamRows = parseGyeongnamTodayAssemblyList(
  JSON.stringify({
    page: { totalCount: 1026, currentPage: 1, totalPage: 103 },
    list: [
      {
        CPDS_SUBJECT: "오늘(5. 21.) 주요집회",
        CPDS_CONTENT: "오늘(5. 21.) 주요집회",
        CPDS_WDATE: "2026-05-21 09:07",
        CPDS_NAME: "정보과",
        IPDS_IDX: "4402",
        IPDS_COUNTS: 73
      }
    ]
  })
);
assert.equal(gyeongnamRows.length, 1);
assert.equal(gyeongnamRows[0]?.sourceId, "4402");
const gyeongnamPayload = toGyeongnamPublicOccurrencePayload(gyeongnamRows[0], new Date("2026-07-10T00:00:00.000+09:00"));
assert.equal(gyeongnamPayload.id, "occ_gyeongnam_2026_05_21_public");
assert.equal(gyeongnamPayload.areaClusterId, "area_gyeongnam");
assert.equal(gyeongnamPayload.startsAt, "2026-05-21T00:00:00.000+09:00");
assert.equal(gyeongnamPayload.lifecycleState, "ENDED");
assert.equal(gyeongnamPayload.rawText.includes("IPDS_IDX=4402"), true);

const jejuRows = parseJejuTodayAssemblyList(`
<tr>
  <td class="no">1915</td>
  <td class="category">제주경찰청</td>
  <td class="title">
    <form action="/jjpolice/notice/assembly.htm?" method="post" style="margin:0; display:inline;">
      <input type="hidden" name="act" value="view"/>
      <input type="hidden" name="seq" value="84777"/>
      <button type="submit" title="&#50724;&#45720;&#51032; &#51665;&#54924;(26.07.10)" style="border:0;">오늘의 집회(26.07.10)</button>
    </form>
  </td>
  <td class="writer">치안정보과</td>
  <td class="wdate">2026. 07. 09.</td>
  <td>24</td>
  <td class="attach"></td>
</tr>`);
assert.equal(jejuRows.length, 1);
assert.equal(jejuRows[0]?.sourceId, "84777");
const jejuPayload = toJejuPublicOccurrencePayload(jejuRows[0], new Date("2026-07-10T00:00:00.000+09:00"));
assert.equal(jejuPayload.id, "occ_jeju_2026_07_10_public");
assert.equal(jejuPayload.areaClusterId, "area_jeju");
assert.equal(jejuPayload.startsAt, "2026-07-10T00:00:00.000+09:00");
assert.equal(jejuPayload.lifecycleState, "UPCOMING");
assert.equal(jejuPayload.rawText.includes("seq=84777"), true);

const chungbukRows = parseChungbukTodayAssemblyList(`
<tr>
  <td>2766</td>
  <td class="sub_line"> <a href='/main_sub/sub.php?id=2774&folder_idx=2&folder_page_idx=18'>2026.7.10.(금) 오늘의 주요 집회</a> <img src='/commons/images/bul/new_ico.jpg' alt='NEW'/> </td>
  <td>집회시위담당</td>
  <td>2026.07.09</td>
  <td>11</td>
</tr>`);
assert.equal(chungbukRows.length, 1);
assert.equal(chungbukRows[0]?.sourceId, "2774");
const chungbukPayload = toChungbukPublicOccurrencePayload(chungbukRows[0], new Date("2026-07-10T00:00:00.000+09:00"));
assert.equal(chungbukPayload.id, "occ_chungbuk_2026_07_10_public");
assert.equal(chungbukPayload.areaClusterId, "area_chungbuk");
assert.equal(chungbukPayload.startsAt, "2026-07-10T00:00:00.000+09:00");
assert.equal(chungbukPayload.lifecycleState, "UPCOMING");
assert.equal(chungbukPayload.rawText.includes("id=2774"), true);

const chungnamRows = parseChungnamTodayAssemblyList(`
<tr css=tr_out>
  <td width=7></td>
  <td width=50 class=small>2889</td>
  <td width=240 class=sub subject=1>
    <a href=?mxPn=3_1_1&kz=%C1%F6%B9%E6%C3%BB&kf1=sub&kf2=&kw=&bo=cnpol2&p=1&ku=50253&mo=v>
      <div>오늘의 주요집회(26.04.01.)</div>
      <div class=subview>오늘의 주요집회(26.04.01.)</div>
    </a>
  </td>
  <td width=60><font color=#911609>충남청</font></td>
  <td width=120>정보상황계</td>
  <td width=80  class=small> 26.03.31</td>
  <td width=50><img src='https://minwon.cnpolice.go.kr//zimage//file/icon_hwp.gif' alt='hwp' align=absmiddle></td>
  <td class=small> 135</td>
  <td width=7></td>
</tr>`);
assert.equal(chungnamRows.length, 1);
assert.equal(chungnamRows[0]?.sourceId, "50253");
const chungnamPayload = toChungnamPublicOccurrencePayload(chungnamRows[0], new Date("2026-07-10T00:00:00.000+09:00"));
assert.equal(chungnamPayload.id, "occ_chungnam_2026_04_01_public");
assert.equal(chungnamPayload.areaClusterId, "area_chungnam");
assert.equal(chungnamPayload.startsAt, "2026-04-01T00:00:00.000+09:00");
assert.equal(chungnamPayload.lifecycleState, "ENDED");
assert.equal(chungnamPayload.rawText.includes("ku=50253"), true);

const jeonbukRows = parseJeonbukTodayAssemblyList(`
<tr>
  <td>2926</td>
  <td class="ta_left">
    <a href="/board/view.police?boardId=BBS_0000013&amp;menuCd=DOM_000000202008000000&amp;startPage=1&amp;dataSid=233618" title="4.18(금) 주요 예정 집회 입니다.">4.18(금) 주요 예정 집회 입니다.</a>
  </td>
  <td>치안정보과</td>
  <td>2025-04-17</td>
  <td><img src="/images/jb_new/bbs/ico_file.gif" alt="첨부파일 있음"/></td>
  <td>512</td>
</tr>`);
assert.equal(jeonbukRows.length, 1);
assert.equal(jeonbukRows[0]?.sourceId, "233618");
const jeonbukPayload = toJeonbukPublicOccurrencePayload(jeonbukRows[0], new Date("2026-07-10T00:00:00.000+09:00"));
assert.equal(jeonbukPayload.id, "occ_jeonbuk_2025_04_18_public");
assert.equal(jeonbukPayload.areaClusterId, "area_jeonbuk");
assert.equal(jeonbukPayload.startsAt, "2025-04-18T00:00:00.000+09:00");
assert.equal(jeonbukPayload.lifecycleState, "ENDED");
assert.equal(jeonbukPayload.rawText.includes("dataSid=233618"), true);

const jeonnamRows = parseJeonnamTodayAssemblyList(`
<tr>
  <td>1</td>
  <td style="text-align:left">
    <a href="/index.jsp;jsessionid=x?pid=AP0306&mode=view&bbsId=sub0306&cur_page=1&searchOpt=&searchWord=&searchBbsCate=&bbsBid=445519">
      2026. 7. 9. 오늘의 주요집회
    </a>
  </td>
  <td></td><td></td><td>2026-07-09  </td><td>5 </td>
</tr>`);
assert.equal(jeonnamRows.length, 1);
assert.equal(jeonnamRows[0]?.sourceId, "445519");
const jeonnamPayload = toJeonnamPublicOccurrencePayload(jeonnamRows[0], new Date("2026-07-10T00:00:00.000+09:00"));
assert.equal(jeonnamPayload.id, "occ_jeonnam_2026_07_09_public");
assert.equal(jeonnamPayload.areaClusterId, "area_jeonnam");
assert.equal(jeonnamPayload.startsAt, "2026-07-09T00:00:00.000+09:00");
assert.equal(jeonnamPayload.lifecycleState, "ENDED");
assert.equal(jeonnamPayload.rawText.includes("bbsBid=445519"), true);

const daejeonRows = parseDaejeonTodayAssemblyList(`
<div class="p-record font18"><div>- [알림]오늘의주요집회 ( 총 306 게시물 중 / <font color=red>최근 20 건</font>)</div></div>
<table summary="[알림]오늘의주요집회 검색결과" class='p-table'>
  <tbody class="text-align--left">
    <tr>
      <th align="left" class="border_r"><em class="em-blue2">[<font color=#911609>대전경찰청</font>]</em>
      <a href="main.htm?mxRc=x7_9&bo=notify3&ku=26623&keyword=집회">260501 오늘의 주요<span style='color:red; background:yellow'>집회</span>...</a>
      </th>
      <td>2026-04-30</td>
    </tr>
  </tbody>
</table>`);
assert.equal(daejeonRows.length, 1);
assert.equal(daejeonRows[0]?.sourceId, "26623");
const daejeonPayload = toDaejeonPublicOccurrencePayload(daejeonRows[0], new Date("2026-07-10T00:00:00.000+09:00"));
assert.equal(daejeonPayload.id, "occ_daejeon_2026_05_01_public");
assert.equal(daejeonPayload.areaClusterId, "area_daejeon_public");
assert.equal(daejeonPayload.startsAt, "2026-05-01T00:00:00.000+09:00");
assert.equal(daejeonPayload.lifecycleState, "ENDED");
assert.equal(daejeonPayload.rawText.includes("sourceList=official-search"), true);

const ulsanRows = parseUlsanTodayAssemblyList(
  `
<tr>
  <td class="b-num">1755</td>
  <td class="b-subject"><a href="#" onclick="goArticle('1764', '0');"> 6.24.(수) 집회표  </a>
    <img src="/skin/images/hwp.gif" alt="파일이미지" />
  </td>
</tr>
<tr>
  <td class="b-num">1754</td>
  <td class="b-subject"><a href="#" onclick="goArticle('1763', '0');">6.19.(금) 집회표 </a></td>
</tr>`,
  new Date("2026-07-10T00:00:00.000+09:00")
);
assert.equal(ulsanRows.length, 2);
assert.equal(ulsanRows[0]?.sourceId, "1764");
assert.equal(ulsanRows[0]?.hasAttachment, true);
const ulsanPayload = toUlsanPublicOccurrencePayload(ulsanRows[0], new Date("2026-07-10T00:00:00.000+09:00"));
assert.equal(ulsanPayload.id, "occ_ulsan_2026_06_24_public");
assert.equal(ulsanPayload.areaClusterId, "area_ulsan");
assert.equal(ulsanPayload.startsAt, "2026-06-24T00:00:00.000+09:00");
assert.equal(ulsanPayload.lifecycleState, "ENDED");
assert.equal(ulsanPayload.rawText.includes("ridx=1764"), true);
assert.equal(ulsanPayload.rawText.includes("dateSource=title"), true);

const seoulRows = parseSeoulAssemblyControlList(
  JSON.stringify({
    result: [
      {
        mgrSeq: "1993",
        assemTitle: "7월 09일 (목) 행사 및 집회",
        lastMdfyDat: "20260705065930",
        readCount: "39"
      }
    ],
    count: 1698
  })
);
assert.equal(seoulRows.length, 1);
assert.equal(seoulRows[0]?.sourceId, "1993");
const seoulPayload = toSeoulPublicOccurrencePayload(seoulRows[0], new Date("2026-07-10T00:00:00.000+09:00"));
assert.equal(seoulPayload.id, "occ_seoul_2026_07_09_public");
assert.equal(seoulPayload.areaClusterId, "area_seoul_public");
assert.equal(seoulPayload.startsAt, "2026-07-09T00:00:00.000+09:00");
assert.equal(seoulPayload.lifecycleState, "ENDED");
assert.equal(seoulPayload.rawText.includes("mgrSeq=1993"), true);
assert.equal(seoulPayload.evidenceUploadedAt, "2026-07-05T06:59:30.000+09:00");

const sejongRows = parseSejongTodayAssemblyList(`
<tr css=tr_out>
  <td class="m-table__num">5789</td>
  <td class="text-align--left m-table__title">
    <a href=?mxPn=02_02&kz=%EC%A7%80%EB%B0%A9%EC%B2%AD&kf1=sub&kf2=&kw=&bo=sjpol2&p=1&ku=5789&mo=v>
      7.10.(금) 주요 예정 집회(없음)...
    </a>
  <td class="m-hidden"><font color=#911609>세종청</font></td>
  <td class="m-hidden">공공안전과</td>
  <td class="m-table__date"> 26.07.09</td>
  <td class="m-hidden">&nbsp;</td>
  <td class="m-hidden"> 3</td>
</tr>
<tr css=tr_out>
  <td class="m-table__num">5778</td>
  <td class="text-align--left m-table__title">
    <a href=?mxPn=02_02&kz=%EC%A7%80%EB%B0%A9%EC%B2%AD&kf1=sub&kf2=&kw=&bo=sjpol2&p=1&ku=5778&mo=v>
      7. 4.(토)~7.6.(월) 주요 예정 집회...
    </a>
  <td class="m-hidden"><font color=#911609>세종청</font></td>
  <td class="m-hidden">공공안전과</td>
  <td class="m-table__date"> 26.07.03</td>
  <td class="m-hidden">&nbsp;</td>
  <td class="m-hidden"> 33</td>
</tr>`);
assert.equal(sejongRows.length, 2);
assert.equal(sejongRows[0]?.sourceId, "5789");
const sejongPayload = toSejongPublicOccurrencePayload(sejongRows[0], new Date("2026-07-10T00:00:00.000+09:00"));
assert.equal(sejongPayload.id, "occ_sejong_2026_07_10_public");
assert.equal(sejongPayload.areaClusterId, "area_sejong");
assert.equal(sejongPayload.startsAt, "2026-07-10T00:00:00.000+09:00");
assert.equal(sejongPayload.lifecycleState, "UPCOMING");
assert.equal(sejongPayload.rawText.includes("ku=5789"), true);
const sejongRangePayload = toSejongPublicOccurrencePayload(sejongRows[1], new Date("2026-07-10T00:00:00.000+09:00"));
assert.equal(sejongRangePayload.startsAt, "2026-07-04T00:00:00.000+09:00");
assert.equal(sejongRangePayload.endsAt, "2026-07-06T23:59:59.000+09:00");

const gyeonggiNorthRows = parseGyeonggiNorthTodayAssemblyList(`
<tr>
  <td>2282</td>
  <td class="sub_line">
    <a href="#LINK" onclick="javascript:fn_inqire_notice('74744','Assembly_main'); return false;" title="일반글">7.10.(금) 집회표</a>
  </td>
  <td>정보상황계</td>
  <td>2026-07-09</td>
  <td><img src="/commons/main/images/basic/add_file.jpg" alt="첨부파일" /></td>
</tr>
<tr>
  <td>2278</td>
  <td class="sub_line">
    <a href="#LINK" onclick="javascript:fn_inqire_notice('74674','Assembly_main'); return false;" title="일반글">7.4.(토)~6.(월) 예정 집회</a>
  </td>
  <td>정보상황계</td>
  <td>2026-07-03</td>
  <td><img src="/commons/main/images/basic/add_file.jpg" alt="첨부파일" /></td>
</tr>`);
assert.equal(gyeonggiNorthRows.length, 2);
assert.equal(gyeonggiNorthRows[0]?.sourceId, "74744");
assert.equal(gyeonggiNorthRows[0]?.title, "7.10.(금) 집회표");
const gyeonggiNorthPayload = toGyeonggiNorthPublicOccurrencePayload(gyeonggiNorthRows[0], new Date("2026-07-10T00:00:00.000+09:00"));
assert.equal(gyeonggiNorthPayload.id, "occ_gyeonggi_north_2026_07_10_public");
assert.equal(gyeonggiNorthPayload.areaClusterId, "area_gyeonggi_north");
assert.equal(gyeonggiNorthPayload.startsAt, "2026-07-10T00:00:00.000+09:00");
assert.equal(gyeonggiNorthPayload.lifecycleState, "UPCOMING");
assert.equal(gyeonggiNorthPayload.rawText.includes("nttId=74744"), true);
const gyeonggiNorthRangePayload = toGyeonggiNorthPublicOccurrencePayload(gyeonggiNorthRows[1], new Date("2026-07-10T00:00:00.000+09:00"));
assert.equal(gyeonggiNorthRangePayload.startsAt, "2026-07-04T00:00:00.000+09:00");
assert.equal(gyeonggiNorthRangePayload.endsAt, "2026-07-06T23:59:59.000+09:00");

const coverage = sourceCoverageReport();
const diagnostics = sourceOperationalDiagnostics();
assert.equal(policeRegions.length, 18);
assert.equal(new Set(policeRegions.map((region) => region.code)).size, policeRegions.length);
assert.equal(ingestablePublicAssemblySources().map((source) => source.id).join(","), "seoul_assembly_control,sejong_today_assembly,daegu_today_assembly,daejeon_today_assembly,gyeonggi_north_today_assembly,gangwon_today_assembly,busan_today_assembly,gyeonggi_south_today_assembly,gwangju_today_assembly,incheon_today_assembly,gyeongbuk_today_assembly,gyeongnam_today_assembly,jeju_today_assembly,chungbuk_today_assembly,chungnam_today_assembly,jeonbuk_today_assembly,jeonnam_today_assembly,ulsan_today_assembly");
assert.equal(coverage.fullScheduleCoverage, true);
assert.equal(coverage.activeScheduleRegions, 18);
assert.equal(coverage.candidateScheduleRegions, 0);
assert.equal(coverage.statisticsOnlyRegions, 0);
assert.equal(coverage.needsDiscoveryRegions, 0);
assert.equal(coverage.policy, "absence_of_public_source_is_not_absence_of_assembly");
assert.equal(coverage.regions.some((region) => region.code === "seoul" && region.status === "schedule_active"), true);
assert.equal(coverage.regions.some((region) => region.code === "sejong" && region.status === "schedule_active"), true);
assert.equal(coverage.regions.some((region) => region.code === "daegu" && region.status === "schedule_active"), true);
assert.equal(coverage.regions.some((region) => region.code === "gangwon" && region.status === "schedule_active"), true);
assert.equal(coverage.regions.some((region) => region.code === "busan" && region.status === "schedule_active"), true);
assert.equal(coverage.regions.some((region) => region.code === "gyeonggi_south" && region.status === "schedule_active"), true);
assert.equal(coverage.regions.some((region) => region.code === "gyeonggi_north" && region.status === "schedule_active"), true);
assert.equal(coverage.regions.some((region) => region.code === "gwangju" && region.status === "schedule_active"), true);
assert.equal(coverage.regions.some((region) => region.code === "incheon" && region.status === "schedule_active"), true);
assert.equal(coverage.regions.some((region) => region.code === "gyeongbuk" && region.status === "schedule_active"), true);
assert.equal(coverage.regions.some((region) => region.code === "gyeongnam" && region.status === "schedule_active"), true);
assert.equal(coverage.regions.some((region) => region.code === "jeju" && region.status === "schedule_active"), true);
assert.equal(coverage.regions.some((region) => region.code === "chungbuk" && region.status === "schedule_active"), true);
assert.equal(coverage.regions.some((region) => region.code === "chungnam" && region.status === "schedule_active"), true);
assert.equal(coverage.regions.some((region) => region.code === "jeonbuk" && region.status === "schedule_active"), true);
assert.equal(coverage.regions.some((region) => region.code === "jeonnam" && region.status === "schedule_active"), true);
assert.equal(coverage.regions.some((region) => region.code === "daejeon" && region.status === "schedule_active"), true);
assert.equal(coverage.regions.some((region) => region.code === "ulsan" && region.status === "schedule_active"), true);
assert.equal(
  coverage.regions.every((region) => region.refreshCadenceHours > 0 && region.lastCheckedAt && region.nextRefreshAt && region.gapReason),
  true
);
assert.equal(coverage.regions.find((region) => region.code === "daegu")?.publicScheduleUrl?.includes("dgpolice.go.kr"), true);
assert.equal(coverage.regions.find((region) => region.code === "gangwon")?.publicScheduleUrl?.includes("gwpolice.go.kr"), true);
assert.equal(coverage.regions.find((region) => region.code === "busan")?.publicScheduleUrl?.includes("bspolice.go.kr"), true);
assert.equal(coverage.regions.find((region) => region.code === "gyeonggi_south")?.publicScheduleUrl?.includes("ggpolice.go.kr"), true);
assert.equal(coverage.regions.find((region) => region.code === "gyeonggi_north")?.publicScheduleUrl?.includes("ggbpolice.go.kr"), true);
assert.equal(coverage.regions.find((region) => region.code === "gwangju")?.publicScheduleUrl?.includes("gjpolice.go.kr"), true);
assert.equal(coverage.regions.find((region) => region.code === "incheon")?.publicScheduleUrl?.includes("icpolice.go.kr"), true);
assert.equal(coverage.regions.find((region) => region.code === "gyeongbuk")?.publicScheduleUrl?.includes("gbpolice.go.kr"), true);
assert.equal(coverage.regions.find((region) => region.code === "gyeongnam")?.publicScheduleUrl?.includes("gnpolice.go.kr"), true);
assert.equal(coverage.regions.find((region) => region.code === "jeju")?.publicScheduleUrl?.includes("jjpolice.go.kr"), true);
assert.equal(coverage.regions.find((region) => region.code === "chungbuk")?.publicScheduleUrl?.includes("cbpolice.go.kr"), true);
assert.equal(coverage.regions.find((region) => region.code === "chungnam")?.publicScheduleUrl?.includes("cnpolice.go.kr"), true);
assert.equal(coverage.regions.find((region) => region.code === "jeonbuk")?.publicScheduleUrl?.includes("jbpolice.go.kr"), true);
assert.equal(coverage.regions.find((region) => region.code === "jeonnam")?.publicScheduleUrl?.includes("jnpolice.go.kr"), true);
assert.equal(coverage.regions.find((region) => region.code === "daejeon")?.publicScheduleUrl?.includes("djpolice.go.kr"), true);
assert.equal(coverage.regions.find((region) => region.code === "ulsan")?.publicScheduleUrl?.includes("uspolice.go.kr"), true);
assert.equal(coverage.regions.find((region) => region.code === "seoul")?.publicScheduleUrl?.includes("spatic.go.kr"), true);
assert.equal(coverage.regions.find((region) => region.code === "seoul")?.coverageLevel, "daily_schedule");
assert.equal(coverage.regions.find((region) => region.code === "sejong")?.publicScheduleUrl?.includes("sjpolice.go.kr"), true);
assert.equal(coverage.regions.find((region) => region.code === "sejong")?.coverageLevel, "daily_schedule");
assert.equal(publicAssemblySources.some((source) => source.kind === "statistics" && source.regionCode === "national"), true);
assert.equal(diagnostics.readyForScheduledIngest, true);
assert.equal(diagnostics.summary.totalPoliceRegions, 18);
assert.equal(diagnostics.summary.activeScheduleSourceCount, 18);
assert.equal(diagnostics.summary.ingestableSourceCount, 18);
assert.equal(diagnostics.summary.parserReadySourceCount, 18);
assert.deepEqual(diagnostics.summary.blockedSourceIds, []);
assert.deepEqual(diagnostics.summary.parserMissingSourceIds, []);
assert.deepEqual(diagnostics.summary.urlMissingSourceIds, []);
assert.deepEqual(diagnostics.summary.postBodyMissingSourceIds, []);
assert.equal(diagnostics.sources.filter((source) => source.method === "POST").every((source) => source.bodyStatus === "present"), true);
assert.equal(diagnostics.sources.filter((source) => source.kind === "schedule").every((source) => source.publicUrl && source.checks.includes("official_url_present")), true);

const workerSource = readFileSync(resolve(import.meta.dirname, "index.ts"), "utf8");
assert.equal(workerSource.includes("process.exit(1)"), true);
assert.equal(workerSource.includes("response.ok"), true);
assert.equal(workerSource.includes("/internal/ingest/public-occurrences/batch"), true);
assert.equal(workerSource.includes("source_fetch_or_parse_failed"), true);
assert.equal(workerSource.includes("source_parse_empty"), true);
assert.equal(workerSource.includes("isWithinOperationalWindow"), true);
assert.equal(workerSource.includes("AbortController"), true);
assert.equal(workerSource.includes("MUSUNIL_API_HOSTPORT"), true);
assert.equal(workerSource.includes("--diagnose"), true);
assert.equal(workerSource.includes("sourceOperationalDiagnostics"), true);
assert.equal(workerSource.includes("--coverage"), true);
assert.equal(workerSource.includes("--laws"), true);
assert.equal(workerSource.includes("--laws-diagnose"), true);
assert.equal(workerSource.includes("lawOperationalDiagnostics"), true);
assert.equal(workerSource.includes("/internal/ingest/laws"), true);
assert.equal(workerSource.includes("laws_disabled"), true);
assert.equal(workerSource.indexOf("law_source_parse_empty") < workerSource.indexOf("laws_dry_run"), true);
assert.equal(workerSource.includes("ingestablePublicAssemblySources"), true);

const lawRuntime = readLawRuntime(
  {
    public_data_sources: {
      national_assembly_bill_api_key: "assembly-key",
      law_go_kr_oc: "law-oc",
      law_interest_keywords: ["정보통신망법"]
    }
  },
  {}
);
assert.equal(lawRuntime.assemblyBillApiKey, "assembly-key");
assert.equal(lawRuntime.assemblyBillApiUrl, "https://open.assembly.go.kr/portal/openapi/ALLBILLV2");
assert.equal(lawRuntime.assemblyBillEra, "제22대");
assert.equal(lawRuntime.lawApiOc, "law-oc");
assert.deepEqual(lawRuntime.keywords, ["정보통신망법"]);
const lawDiagnostics = lawOperationalDiagnostics(lawRuntime);
assert.equal(lawDiagnostics.readyForMetadataCheck, true);
assert.equal(lawDiagnostics.readyForOperationalIngest, true);
assert.equal(lawDiagnostics.summary.keywordCount, 1);
assert.equal(lawDiagnostics.summary.credentialConfigured, true);
assert.equal(lawDiagnostics.summary.assemblyBillCredentialConfigured, true);
assert.equal(lawDiagnostics.summary.lawGoKrCredentialConfigured, true);
assert.equal(lawDiagnostics.summary.officialEndpointCount, 2);
assert.equal(lawDiagnostics.providers.every((provider) => provider.endpointStatus === "official"), true);
assert.equal(JSON.stringify(lawDiagnostics).includes("assembly-key"), false);
assert.equal(JSON.stringify(lawDiagnostics).includes("law-oc"), false);
const disabledLawDiagnostics = lawOperationalDiagnostics(readLawRuntime({}, {}));
assert.equal(disabledLawDiagnostics.readyForMetadataCheck, true);
assert.equal(disabledLawDiagnostics.readyForOperationalIngest, false);
assert.equal(disabledLawDiagnostics.summary.credentialConfigured, false);
assert.equal(disabledLawDiagnostics.summary.requiredActions.some((action) => action.includes("국회 의안 API key")), true);

const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = String(input);
  if (url.includes("ALLBILLV2")) {
    const requestUrl = new URL(url);
    const page = requestUrl.searchParams.get("pIndex");
    assert.equal(requestUrl.searchParams.get("KEY"), "assembly-key");
    assert.equal(requestUrl.searchParams.get("Type"), "json");
    assert.equal(requestUrl.searchParams.get("ERACO"), "제22대");
    return new Response(
      JSON.stringify({
        list_total_count: 200,
        head: [{ list_total_count: 200 }, { RESULT: { CODE: "INFO-000", MESSAGE: "NORMAL SERVICE" } }],
        row: page === "2" ? [
          {
            BILL_NM: "공직선거법 일부개정법률안",
            BILL_ID: "bill-election-newer",
            BILL_NO: "2219999",
            PROC_STAGE_CD: "접수",
            PPSL_DT: "20260710",
            LINK_URL: "https://untrusted.example/bill-election-newer"
          }
        ] : [
          {
            BILL_NM: "정보통신망법 일부개정법률안",
            BILL_ID: "bill-info-network",
            BILL_NO: "2219998",
            JRCMIT_NM: "과학기술정보방송통신위원회",
            PPSL_DT: "20260709",
            PPSR_NM: "국회의원 10인",
            LINK_URL: "https://open.assembly.go.kr/bill-info-network"
          },
          { BILL_NM: "관계없는 법률안", BILL_ID: "bill-unrelated" }
        ]
      })
    );
  }
  if (url.includes("BPMBILLSUMMARY")) {
    const requestUrl = new URL(url);
    assert.equal(requestUrl.searchParams.get("KEY"), "assembly-key");
    assert.equal(requestUrl.searchParams.get("Type"), "json");
    const billNo = requestUrl.searchParams.get("BILL_NO");
    return new Response(JSON.stringify({ row: [{ BILL_NAME: "법률안", BILL_NO: billNo, SUMMARY: `${billNo} 공식 제안이유 및 주요내용` }] }));
  }
  return new Response(
    JSON.stringify({
      LawSearch: {
        law: {
          법령명한글: "공직선거법",
          법령ID: "001",
          제개정구분명: "현행 법령",
          시행일자: "20260710",
          법령상세링크: "https://www.law.go.kr/법령/공직선거법"
        }
      }
    })
  );
}) as typeof fetch;
try {
  const lawPayloads = await fetchLawPayloads({
    assemblyBillApiKey: "assembly-key",
    assemblyBillApiUrl: "https://open.assembly.go.kr/portal/openapi/ALLBILLV2",
    assemblyBillEra: "제22대",
    lawApiOc: "law-oc",
    lawApiBaseUrl: "https://www.law.go.kr/DRF/lawSearch.do",
    keywords: ["정보통신망법", "공직선거법"]
  });
  assert.equal(lawPayloads.some((payload) => payload.source === "assembly_bill" && payload.assemblyBillId === "bill-info-network"), true);
  assert.equal(lawPayloads.some((payload) => payload.assemblyBillNo === "2219998" && payload.proposer === "국회의원 10인" && payload.proposalSummary?.includes("공식 제안이유")), true);
  assert.equal(lawPayloads.some((payload) => payload.assemblyBillNo === "2219998" && payload.summary === "국회의원 10인"), false);
  assert.equal(lawPayloads.some((payload) => payload.source === "assembly_bill" && payload.assemblyBillId === "bill-election-newer" && payload.proposedDate === "2026-07-10T00:00:00.000+09:00"), true);
  assert.equal(lawPayloads.some((payload) => payload.officialUrl?.includes("untrusted.example")), false);
  assert.equal(lawPayloads.some((payload) => payload.source === "law_effective" && payload.lawName === "공직선거법"), true);
  assert.equal(lawPayloads.some((payload) => payload.billTitle === "관계없는 법률안"), false);
} finally {
  globalThis.fetch = originalFetch;
}

assert.equal(cleanNewsText("<b>공직선거법</b> &quot;개정&quot; &amp; 검토"), '공직선거법 "개정" & 검토');
const rssPublishedAt = new Date().toUTCString();
const parsedNews = parsePublisherRss(`<rss><channel><item><title><![CDATA[<b>공직선거법</b> 투표관리 강화]]></title><link>https://news.example/article</link><description>투표용지 공급 대응</description><pubDate>${rssPublishedAt}</pubDate></item></channel></rss>`);
assert.equal(parsedNews.length, 1);
assert.equal(parsedNews[0]?.title, "공직선거법 투표관리 강화");
const newsRuntime = readNewsRuntime({ public_data_sources: {
  news_min_request_interval_ms: 0,
  news_rss_feeds: [
    { id: "yonhap", publisher_label: "연합뉴스", url: "https://www.yna.co.kr/rss/news.xml" },
    { id: "hani", publisher_label: "한겨레", url: "https://www.hani.co.kr/rss/" },
    { id: "sbs", publisher_label: "SBS", url: "https://news.sbs.co.kr/news/SectionRssFeed.do?sectionId=01" }
  ]
} }, {});
assert.equal(newsOperationalDiagnostics(newsRuntime).readyForOperationalIngest, true);
const disabledNewsDiagnostics = newsOperationalDiagnostics(readNewsRuntime({ public_data_sources: {} }, {}));
assert.equal(disabledNewsDiagnostics.readyForMetadataCheck, true);
assert.equal(disabledNewsDiagnostics.readyForOperationalIngest, true);
const newsGroups = [{
  id: "law-group-election",
  lawName: "공직선거법",
  billTitle: "공직선거법 일부개정법률안",
  coreTopics: [{ key: "ballot", label: "투표관리 강화", representativeKeywords: ["투표용지", "투표관리"], billCount: 2 }],
  bills: [{ assemblyBillNo: "2219998", proposer: "윤재옥의원 등 10인" }]
}];
let rssFetchIndex = 0;
globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
  const requestedUrl = new URL(String(_input));
  assert.equal(["www.yna.co.kr", "www.hani.co.kr", "news.sbs.co.kr"].includes(requestedUrl.hostname), true);
  assert.equal((init?.headers as Record<string, string>).accept.includes("application/rss+xml"), true);
  rssFetchIndex += 1;
  return new Response(`<rss><channel><item><title><![CDATA[공직선거법 투표관리 강화 개정안 2219998 발의]]></title><link>https://news-${rssFetchIndex}.example/article-2219998</link><description>투표용지 공급 대응</description><pubDate>${rssPublishedAt}</pubDate></item></channel></rss>`);
}) as typeof fetch;
try {
  const newsResult = await fetchNewsPayloads(newsRuntime, newsGroups, 20_000);
  assert.equal(newsResult.callCount, 3);
  assert.equal(newsResult.payloads.length, 3);
  assert.equal(newsResult.payloads.every((payload) => payload.coreTopicKey === "ballot"), true);
  assert.equal(newsResult.payloads.every((payload) => payload.directBillMatch), true);
  assert.equal(new Set(newsResult.payloads.map((payload) => payload.publisherLabel)).size, 3);
} finally {
  globalThis.fetch = originalFetch;
}
