/**
 * GENERATED — do not edit by hand.
 *
 *   node scripts/import-universities.mjs
 *
 * Source: data/raw/universities_verified.json (75 universities,
 * collected 2026-09-16). Every date below was read out of that file by
 * scripts/import-universities.mjs, which documents the rules it used.
 *
 * Deadlines in this catalogue: 23 taken verbatim from a source,
 * 38 with the year resolved by the 2027 intake-cycle rule
 * (marked `derived`), 8 already past on the day the data was
 * collected and therefore last cycle's window (marked `last_cycle`), and
 * 6 with no date at all — those programmes report `needs_data`
 * rather than showing a number nobody published.
 */
import type { ActionStep, Program, Source } from "@/lib/types";

export const IMPORTED_SOURCES: readonly Source[] = [
  {
    "id": "estimate",
    "title": "Оценка длительности шага",
    "publisher": "Stepwise",
    "confidence": "demo",
    "note": "Сколько времени занимает шаг — наша оценка, а не факт из источника. Даты дедлайнов берутся только из источников."
  },
  {
    "id": "ref:ucas_oct",
    "title": "UCAS — дедлайн 2027 entry для Oxford, Cambridge, медицины, ветеринарии и стоматологии",
    "publisher": "Официальный источник",
    "url": "https://www.ucas.com/events/2027-entry-deadline-for-the-universities-of-oxford-and-cambridge-and-most-courses-in-medicine-475536",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "ref:ucas_jan",
    "title": "UCAS — основной дедлайн 2027 entry",
    "publisher": "Официальный источник",
    "url": "https://www.ucas.com/events/2027-entry-deadline-for-all-undergraduate-courses-except-those-with-a-15-october-deadline-475546",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "ref:nu_admissions",
    "title": "Nazarbayev University — требования к поступлению",
    "publisher": "Официальный источник",
    "url": "https://apply.nu.edu.kz/en/admissions",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "ref:ent_threshold",
    "title": "Пороговые баллы ЕНТ (Национальный центр тестирования, брифинг 26.02.2026)",
    "publisher": "Официальный источник",
    "url": "https://www.nur.kz/society/2348017-porogovye-bally-i-granty-vypusknikam-kazahstana-raskryli-informaciyu-po-ent-2026/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "ref:ent_dates",
    "title": "ЕНТ-2026: регистрация и сроки тестирования",
    "publisher": "Официальный источник",
    "url": "https://tengrinews.kz/newseducation/v-kazahstane-startuet-registratsiya-na-ent-596716/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "ref:grant_rules",
    "title": "Конкурс образовательных грантов: сроки и правила",
    "publisher": "Официальный источник",
    "url": "https://el.kz/ru/kak-postupit-na-grant-v-kazahstane-v-2026-godu-sroki-dokumenty-i-pravila_400049663/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "ref:sat_dates",
    "title": "Даты SAT и дедлайны регистрации 2026–2027",
    "publisher": "Официальный источник",
    "url": "https://testinnovators.com/blog/sat-test-dates/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "ref:stipendium",
    "title": "Stipendium Hungaricum — приём 2026/27",
    "publisher": "Официальный источник",
    "url": "https://stipendiumhungaricum.hu/news/application-is-on-for-the-2026-2027-stipendium-hungaricum-scholarship/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "ref:turkiye",
    "title": "Türkiye Bursları — приём 2026",
    "publisher": "Официальный источник",
    "url": "https://www.turkiyeburslari.gov.tr/announcements/turkiye-scholarships-2026-applications-121",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:mit",
    "title": "Massachusetts Institute of Technology — приём и сроки",
    "publisher": "Massachusetts Institute of Technology",
    "url": "https://mitadmissions.org/apply/firstyear/deadlines-requirements/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:icl",
    "title": "Imperial College London — приём и сроки",
    "publisher": "Imperial College London",
    "url": "https://www.imperial.ac.uk/study/apply/undergraduate/entry-requirements/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:oxford",
    "title": "University of Oxford — приём и сроки",
    "publisher": "University of Oxford",
    "url": "https://www.ox.ac.uk/admissions/undergraduate/applying-to-oxford",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:stanford",
    "title": "Stanford University — приём и сроки",
    "publisher": "Stanford University",
    "url": "https://admission.stanford.edu/apply/first-year/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:harvard",
    "title": "Harvard University — приём и сроки",
    "publisher": "Harvard University",
    "url": "https://college.harvard.edu/admissions/apply/application-requirements",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:cambridge",
    "title": "University of Cambridge — приём и сроки",
    "publisher": "University of Cambridge",
    "url": "https://www.undergraduate.study.cam.ac.uk/applying",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:eth",
    "title": "ETH Zürich — приём и сроки",
    "publisher": "ETH Zürich",
    "url": "https://ethz.ch/en/studies/bachelor/application/non-swiss-matriculation-certificate/language-requirements.html",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:nus",
    "title": "National University of Singapore — приём и сроки",
    "publisher": "National University of Singapore",
    "url": "https://www.nus.edu.sg/oam/admissions/important-dates",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:ucl",
    "title": "University College London — приём и сроки",
    "publisher": "University College London",
    "url": "https://www.ucl.ac.uk/prospective-students/undergraduate/application-and-entry",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:caltech",
    "title": "California Institute of Technology — приём и сроки",
    "publisher": "California Institute of Technology",
    "url": "https://www.admissions.caltech.edu/apply/first-year-applicants/standardized-tests",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:princeton",
    "title": "Princeton University — приём и сроки",
    "publisher": "Princeton University",
    "url": "https://admission.princeton.edu/apply/first-year-application-dates-deadlines",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:cornell",
    "title": "Cornell University — приём и сроки",
    "publisher": "Cornell University",
    "url": "https://admissions.cornell.edu/how-to-apply/first-year-applicants",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:jhu",
    "title": "Johns Hopkins University — приём и сроки",
    "publisher": "Johns Hopkins University",
    "url": "https://apply.jhu.edu/how-to-apply/application-deadlines-requirements/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:berkeley",
    "title": "University of California, Berkeley — приём и сроки",
    "publisher": "University of California, Berkeley",
    "url": "https://admission.universityofcalifornia.edu/how-to-apply/applying-as-a-freshman/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:cmu",
    "title": "Carnegie Mellon University — приём и сроки",
    "publisher": "Carnegie Mellon University",
    "url": "https://www.cmu.edu/admission/admission/application-plans-deadlines",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:umich",
    "title": "University of Michigan — приём и сроки",
    "publisher": "University of Michigan",
    "url": "https://admissions.umich.edu/apply/international-applicants/requirements-deadlines",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:purdue",
    "title": "Purdue University — приём и сроки",
    "publisher": "Purdue University",
    "url": "https://www.admissions.purdue.edu/become-student/guide/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:lse",
    "title": "London School of Economics — приём и сроки",
    "publisher": "London School of Economics",
    "url": "https://www.lse.ac.uk/study-at-lse/Undergraduate/entry-requirements",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:edinburgh",
    "title": "University of Edinburgh — приём и сроки",
    "publisher": "University of Edinburgh",
    "url": "https://www.ed.ac.uk/studying/undergraduate/applying",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:kcl",
    "title": "King's College London — приём и сроки",
    "publisher": "King's College London",
    "url": "https://www.kcl.ac.uk/study/undergraduate/how-to-apply",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:warwick",
    "title": "University of Warwick — приём и сроки",
    "publisher": "University of Warwick",
    "url": "https://warwick.ac.uk/study/undergraduate/apply/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:glasgow",
    "title": "University of Glasgow — приём и сроки",
    "publisher": "University of Glasgow",
    "url": "https://www.gla.ac.uk/undergraduate/entryrequirements/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:manchester",
    "title": "University of Manchester — приём и сроки",
    "publisher": "University of Manchester",
    "url": "https://www.manchester.ac.uk/study/undergraduate/applications/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:bristol",
    "title": "University of Bristol — приём и сроки",
    "publisher": "University of Bristol",
    "url": "https://www.bristol.ac.uk/study/undergraduate/apply/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:epfl",
    "title": "EPFL — приём и сроки",
    "publisher": "EPFL",
    "url": "https://www.epfl.ch/education/admission/admission-2/bachelor-admission-criteria-and-application/how-to-apply/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:tum",
    "title": "Technical University of Munich — приём и сроки",
    "publisher": "Technical University of Munich",
    "url": "https://www.tum.de/en/studies/application/application-info-portal/application-international",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:lmu",
    "title": "LMU Munich — приём и сроки",
    "publisher": "LMU Munich",
    "url": "https://www.lmu.de/en/study/degree-students/dates-and-deadlines/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:heidelberg",
    "title": "Heidelberg University — приём и сроки",
    "publisher": "Heidelberg University",
    "url": "https://www.uni-heidelberg.de/en/study/management-of-studies/key-dates-deadlines/application-deadlines-for-the-1st-semester-of-undergraduate-degree-programmes",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:rwth",
    "title": "RWTH Aachen — приём и сроки",
    "publisher": "RWTH Aachen",
    "url": "https://www.rwth-aachen.de/cms/root/studium/vor-dem-studium/zugangsvoraussetzungen/zugangsvoraussetzung-fuer-den-bachelor-un/~drar/zugangsvoraussetzungen-fuer-internationa/?lidx=1",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:tudelft",
    "title": "TU Delft — приём и сроки",
    "publisher": "TU Delft",
    "url": "https://www.tudelft.nl/en/education/admission-and-application/bsc-international-diploma/dates-deadlines",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:uva",
    "title": "University of Amsterdam — приём и сроки",
    "publisher": "University of Amsterdam",
    "url": "https://www.uva.nl/en/education/admissions/bachelors/applying-for-a-degree-programme.html",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:karolinska",
    "title": "Karolinska Institutet — приём и сроки",
    "publisher": "Karolinska Institutet",
    "url": "https://education.ki.se/bachelors-masters-studies/apply/apply-for-a-bachelors-programme",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:sorbonne",
    "title": "Sorbonne Université — приём и сроки",
    "publisher": "Sorbonne Université",
    "url": "https://www.sorbonne-universite.fr/en/education/study-sorbonne-university/degree-seeking-students/academic-and-language-requirements",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:bocconi",
    "title": "Bocconi University — приём и сроки",
    "publisher": "Bocconi University",
    "url": "https://www.unibocconi.it/en/applying-bocconi/bachelor-and-law-programs/application-and-admissions/admissions",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:polimi",
    "title": "Politecnico di Milano — приём и сроки",
    "publisher": "Politecnico di Milano",
    "url": "https://www.polimi.it/fileadmin/user_upload/futuri_studenti/Engineering_BSc_call_for_admission_2026-27__English_.pdf",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:tuwien",
    "title": "TU Wien — приём и сроки",
    "publisher": "TU Wien",
    "url": "https://www.tuwien.at/en/studies/admission/bachelors-programmes/admission-with-an-international-school-leaving-certificate",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:charles",
    "title": "Charles University — приём и сроки",
    "publisher": "Charles University",
    "url": "https://en.lf1.cuni.cz/admission-20262027",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:semmelweis",
    "title": "Semmelweis University — приём и сроки",
    "publisher": "Semmelweis University",
    "url": "https://semmelweis.hu/admission/programs/medicine/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:bme",
    "title": "Budapest University of Technology (BME) — приём и сроки",
    "publisher": "Budapest University of Technology (BME)",
    "url": "https://xplore.bme.hu/admission/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:uj",
    "title": "Jagiellonian University — приём и сроки",
    "publisher": "Jagiellonian University",
    "url": "https://medschool.uj.edu.pl/prospective-students/md-program-in-english/admission-criteria/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:ntu",
    "title": "Nanyang Technological University — приём и сроки",
    "publisher": "Nanyang Technological University",
    "url": "https://www.ntu.edu.sg/admissions/undergraduate/admission-guide",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:hku",
    "title": "University of Hong Kong — приём и сроки",
    "publisher": "University of Hong Kong",
    "url": "https://admissions.hku.hk/apply/international-qualifications",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:hkust",
    "title": "HKUST — приём и сроки",
    "publisher": "HKUST",
    "url": "https://join.hkust.edu.hk/admissions/international-qualifications",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:utokyo",
    "title": "University of Tokyo — приём и сроки",
    "publisher": "University of Tokyo",
    "url": "https://peak.c.u-tokyo.ac.jp/vcms_lf/ApplicationGuidelines_2026.pdf",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:kyoto",
    "title": "Kyoto University — приём и сроки",
    "publisher": "Kyoto University",
    "url": "https://www.iup.kyoto-u.ac.jp/apply/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:snu",
    "title": "Seoul National University — приём и сроки",
    "publisher": "Seoul National University",
    "url": "https://en.snu.ac.kr/admission/overview/notice?md=v&bbsidx=172484",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:bogazici",
    "title": "Boğaziçi University — приём и сроки",
    "publisher": "Boğaziçi University",
    "url": "https://intl.bogazici.edu.tr/required-documents-undergraduate-application",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:metu",
    "title": "Middle East Technical University (ODTÜ) — приём и сроки",
    "publisher": "Middle East Technical University (ODTÜ)",
    "url": "https://iso.metu.edu.tr/en/application-requirements",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:koc",
    "title": "Koç University — приём и сроки",
    "publisher": "Koç University",
    "url": "https://international.ku.edu.tr/undergraduate-programs/how-to-apply/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:hacettepe",
    "title": "Hacettepe University — приём и сроки",
    "publisher": "Hacettepe University",
    "url": "https://www.studyinturkiye.gov.tr/UniversityTurkey/Detail?uId=113082",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:utoronto",
    "title": "University of Toronto — приём и сроки",
    "publisher": "University of Toronto",
    "url": "https://future.utoronto.ca/deadlines",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:ubc",
    "title": "University of British Columbia — приём и сроки",
    "publisher": "University of British Columbia",
    "url": "https://you.ubc.ca/applying-ubc/dates-deadlines/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:mcgill",
    "title": "McGill University — приём и сроки",
    "publisher": "McGill University",
    "url": "https://www.mcgill.ca/importantdates/channels/event/application-deadline-fall-2026-admission-undergraduate-programs-applicants-studying-or-who-last-363146",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:mcmaster",
    "title": "McMaster University — приём и сроки",
    "publisher": "McMaster University",
    "url": "https://www.ouac.on.ca/guide/undergrad-mcmaster/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:waterloo",
    "title": "University of Waterloo — приём и сроки",
    "publisher": "University of Waterloo",
    "url": "https://uwaterloo.ca/future-students/admissions/deadlines",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:nu",
    "title": "Nazarbayev University — приём и сроки",
    "publisher": "Nazarbayev University",
    "url": "https://nu.edu.kz/news-en/admission-to-nu-categories-and-important-dates/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:kaznu",
    "title": "Казахский национальный университет им. аль-Фараби — приём и сроки",
    "publisher": "Казахский национальный университет им. аль-Фараби",
    "url": "https://el.kz/ru/kak-postupit-na-grant-v-kazahstane-v-2026-godu-sroki-dokumenty-i-pravila_400049663/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:enu",
    "title": "Евразийский национальный университет им. Л.Н. Гумилёва — приём и сроки",
    "publisher": "Евразийский национальный университет им. Л.Н. Гумилёва",
    "url": "https://el.kz/ru/kak-postupit-na-grant-v-kazahstane-v-2026-godu-sroki-dokumenty-i-pravila_400049663/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:satbayev",
    "title": "Satbayev University (КазНИТУ) — приём и сроки",
    "publisher": "Satbayev University (КазНИТУ)",
    "url": "https://el.kz/ru/kak-postupit-na-grant-v-kazahstane-v-2026-godu-sroki-dokumenty-i-pravila_400049663/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:kbtu",
    "title": "Казахстанско-Британский технический университет (КБТУ) — приём и сроки",
    "publisher": "Казахстанско-Британский технический университет (КБТУ)",
    "url": "https://el.kz/ru/kak-postupit-na-grant-v-kazahstane-v-2026-godu-sroki-dokumenty-i-pravila_400049663/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:aitu",
    "title": "Astana IT University — приём и сроки",
    "publisher": "Astana IT University",
    "url": "https://el.kz/ru/kak-postupit-na-grant-v-kazahstane-v-2026-godu-sroki-dokumenty-i-pravila_400049663/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:sdu",
    "title": "Suleyman Demirel University (SDU) — приём и сроки",
    "publisher": "Suleyman Demirel University (SDU)",
    "url": "https://el.kz/ru/kak-postupit-na-grant-v-kazahstane-v-2026-godu-sroki-dokumenty-i-pravila_400049663/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:kimep",
    "title": "КИМЭП — приём и сроки",
    "publisher": "КИМЭП",
    "url": "https://el.kz/ru/kak-postupit-na-grant-v-kazahstane-v-2026-godu-sroki-dokumenty-i-pravila_400049663/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:narxoz",
    "title": "Narxoz University — приём и сроки",
    "publisher": "Narxoz University",
    "url": "https://el.kz/ru/kak-postupit-na-grant-v-kazahstane-v-2026-godu-sroki-dokumenty-i-pravila_400049663/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:almau",
    "title": "Алматы Менеджмент Университет (AlmaU) — приём и сроки",
    "publisher": "Алматы Менеджмент Университет (AlmaU)",
    "url": "https://el.kz/ru/kak-postupit-na-grant-v-kazahstane-v-2026-godu-sroki-dokumenty-i-pravila_400049663/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:kaznmu",
    "title": "Казахский национальный медицинский университет им. С.Д. Асфендиярова — приём и сроки",
    "publisher": "Казахский национальный медицинский университет им. С.Д. Асфендиярова",
    "url": "https://el.kz/ru/kak-postupit-na-grant-v-kazahstane-v-2026-godu-sroki-dokumenty-i-pravila_400049663/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:amu",
    "title": "Медицинский университет Астана — приём и сроки",
    "publisher": "Медицинский университет Астана",
    "url": "https://el.kz/ru/kak-postupit-na-grant-v-kazahstane-v-2026-godu-sroki-dokumenty-i-pravila_400049663/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:kmu",
    "title": "Медицинский университет Караганды — приём и сроки",
    "publisher": "Медицинский университет Караганды",
    "url": "https://el.kz/ru/kak-postupit-na-grant-v-kazahstane-v-2026-godu-sroki-dokumenty-i-pravila_400049663/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:wkmu",
    "title": "Западно-Казахстанский медицинский университет им. М. Оспанова — приём и сроки",
    "publisher": "Западно-Казахстанский медицинский университет им. М. Оспанова",
    "url": "https://el.kz/ru/kak-postupit-na-grant-v-kazahstane-v-2026-godu-sroki-dokumenty-i-pravila_400049663/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:abaiuniver",
    "title": "Казахский национальный педагогический университет им. Абая — приём и сроки",
    "publisher": "Казахский национальный педагогический университет им. Абая",
    "url": "https://el.kz/ru/kak-postupit-na-grant-v-kazahstane-v-2026-godu-sroki-dokumenty-i-pravila_400049663/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:ablaikhan",
    "title": "КазУМОиМЯ им. Абылай хана — приём и сроки",
    "publisher": "КазУМОиМЯ им. Абылай хана",
    "url": "https://el.kz/ru/kak-postupit-na-grant-v-kazahstane-v-2026-godu-sroki-dokumenty-i-pravila_400049663/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:aues",
    "title": "Алматинский университет энергетики и связи им. Г. Даукеева — приём и сроки",
    "publisher": "Алматинский университет энергетики и связи им. Г. Даукеева",
    "url": "https://el.kz/ru/kak-postupit-na-grant-v-kazahstane-v-2026-godu-sroki-dokumenty-i-pravila_400049663/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:auezov",
    "title": "Южно-Казахстанский университет им. М. Ауэзова — приём и сроки",
    "publisher": "Южно-Казахстанский университет им. М. Ауэзова",
    "url": "https://el.kz/ru/kak-postupit-na-grant-v-kazahstane-v-2026-godu-sroki-dokumenty-i-pravila_400049663/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:ktu",
    "title": "Карагандинский технический университет им. А. Сагинова — приём и сроки",
    "publisher": "Карагандинский технический университет им. А. Сагинова",
    "url": "https://el.kz/ru/kak-postupit-na-grant-v-kazahstane-v-2026-godu-sroki-dokumenty-i-pravila_400049663/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  },
  {
    "id": "src:kazatu",
    "title": "Казахский агротехнический университет им. С. Сейфуллина — приём и сроки",
    "publisher": "Казахский агротехнический университет им. С. Сейфуллина",
    "url": "https://el.kz/ru/kak-postupit-na-grant-v-kazahstane-v-2026-godu-sroki-dokumenty-i-pravila_400049663/",
    "accessed_at": "2026-09-16",
    "confidence": "verified"
  }
];

export const IMPORTED_ACTIONS: ActionStep[] = [
  {
    "id": "ent_reg",
    "title": "Зарегистрироваться на ЕНТ",
    "kind": "exam_registration",
    "hard_deadline": {
      "date": "2027-04-25",
      "confidence": "derived",
      "source_id": "ref:ent_dates",
      "checked_at": "2026-09-16"
    },
    "duration_days": 0,
    "depends_on": [],
    "unlocks": [
      "ent_exam"
    ],
    "effort_minutes": 60,
    "source_id": "ref:ent_dates"
  },
  {
    "id": "ent_exam",
    "title": "Сдать ЕНТ",
    "kind": "exam",
    "hard_deadline": {
      "date": "2027-07-10",
      "confidence": "derived",
      "source_id": "ref:ent_dates",
      "checked_at": "2026-09-16"
    },
    "duration_days": 10,
    "depends_on": [
      "ent_reg"
    ],
    "unlocks": [],
    "effort_minutes": 300,
    "source_id": "ref:ent_dates"
  },
  {
    "id": "kz_grant_apply",
    "title": "Подать документы на конкурс грантов",
    "kind": "application",
    "hard_deadline": {
      "date": "2027-07-20",
      "confidence": "derived",
      "source_id": "ref:grant_rules",
      "checked_at": "2026-09-16"
    },
    "duration_days": 0,
    "depends_on": [
      "ent_exam"
    ],
    "unlocks": [],
    "effort_minutes": 120,
    "source_id": "ref:grant_rules"
  },
  {
    "id": "ielts_reg",
    "title": "Записаться на IELTS",
    "kind": "exam_registration",
    "duration_days": 0,
    "depends_on": [],
    "unlocks": [
      "ielts_exam"
    ],
    "effort_minutes": 30,
    "cost": {
      "amount": 130000,
      "currency": "KZT"
    },
    "source_id": "estimate"
  },
  {
    "id": "ielts_exam",
    "title": "Сдать IELTS",
    "kind": "language_test",
    "duration_days": 14,
    "depends_on": [
      "ielts_reg"
    ],
    "unlocks": [],
    "effort_minutes": 240,
    "source_id": "estimate"
  },
  {
    "id": "sat_reg",
    "title": "Зарегистрироваться на SAT",
    "kind": "exam_registration",
    "duration_days": 0,
    "depends_on": [],
    "unlocks": [
      "sat_exam"
    ],
    "effort_minutes": 30,
    "cost": {
      "amount": 110,
      "currency": "USD"
    },
    "source_id": "ref:sat_dates"
  },
  {
    "id": "sat_exam",
    "title": "Сдать SAT",
    "kind": "exam",
    "duration_days": 21,
    "depends_on": [
      "sat_reg"
    ],
    "unlocks": [],
    "effort_minutes": 300,
    "source_id": "ref:sat_dates"
  },
  {
    "id": "docs_translate",
    "title": "Перевести и заверить документы",
    "kind": "document",
    "duration_days": 21,
    "depends_on": [],
    "unlocks": [],
    "effort_minutes": 180,
    "cost": {
      "amount": 25000,
      "currency": "KZT"
    },
    "source_id": "estimate"
  },
  {
    "id": "ucas_apply",
    "title": "Подать заявку через UCAS",
    "kind": "application",
    "duration_days": 14,
    "depends_on": [],
    "unlocks": [],
    "effort_minutes": 240,
    "source_id": "ref:ucas_jan"
  },
  {
    "id": "apply_form",
    "title": "Заполнить и отправить заявку",
    "kind": "application",
    "duration_days": 10,
    "depends_on": [],
    "unlocks": [],
    "effort_minutes": 180,
    "source_id": "estimate"
  }
];

/** Rounds earlier than the closing one, kept so a screen can mention them. */
export const DEADLINE_ROUNDS: Readonly<Record<string, readonly string[]>> = {
  "mit": [
    "2026-11-01"
  ],
  "stanford": [
    "2026-10-15"
  ],
  "harvard": [
    "2026-11-01"
  ],
  "nus": [
    "2026-12-16"
  ],
  "caltech": [
    "2026-10-31",
    "2026-11-30"
  ],
  "princeton": [
    "2026-11-01"
  ],
  "cornell": [
    "2026-11-01"
  ],
  "jhu": [
    "2026-11-01",
    "2027-01-02"
  ],
  "berkeley": [
    "2026-08-01",
    "2026-10-01"
  ],
  "cmu": [
    "2026-11-02",
    "2026-12-01"
  ],
  "umich": [
    "2026-11-01"
  ],
  "edinburgh": [
    "2026-10-15"
  ],
  "kcl": [
    "2026-10-15"
  ],
  "glasgow": [
    "2026-10-15"
  ],
  "manchester": [
    "2026-10-15"
  ],
  "bristol": [
    "2026-10-15"
  ],
  "tum": [
    "2026-09-30"
  ],
  "lmu": [
    "2027-01-15"
  ],
  "heidelberg": [
    "2026-10-31",
    "2027-04-30"
  ],
  "rwth": [
    "2027-01-15"
  ],
  "tudelft": [
    "2026-10-15",
    "2027-01-15"
  ],
  "uva": [
    "2027-01-15",
    "2027-02-01",
    "2027-04-01"
  ],
  "karolinska": [
    "2026-10-16",
    "2027-01-15"
  ],
  "bocconi": [
    "2026-09-29",
    "2026-11-25"
  ],
  "polimi": [
    "2026-06-11",
    "2026-07-15",
    "2026-08-05"
  ],
  "tuwien": [
    "2027-01-15",
    "2027-01-16",
    "2027-07-15"
  ],
  "charles": [
    "2025-12-01",
    "2026-09-05"
  ],
  "semmelweis": [
    "2026-01-12"
  ],
  "ntu": [
    "2026-10-15"
  ],
  "hku": [
    "2026-09-23",
    "2026-11-25",
    "2026-12-01"
  ],
  "hkust": [
    "2026-11-25",
    "2026-11-26"
  ],
  "utokyo": [
    "2025-10-03"
  ],
  "utoronto": [
    "2026-11-07",
    "2026-12-02",
    "2027-01-15"
  ],
  "ubc": [
    "2026-11-15"
  ],
  "waterloo": [
    "2026-11-12",
    "2027-01-06",
    "2027-01-15"
  ],
  "nu": [
    "2026-10-16",
    "2026-12-07"
  ],
  "kaznu": [
    "2027-04-25"
  ],
  "enu": [
    "2027-04-25"
  ],
  "satbayev": [
    "2027-04-25"
  ],
  "kbtu": [
    "2027-04-25"
  ],
  "aitu": [
    "2027-04-25"
  ],
  "sdu": [
    "2027-04-25"
  ],
  "kimep": [
    "2027-04-25"
  ],
  "narxoz": [
    "2027-04-25"
  ],
  "almau": [
    "2027-04-25"
  ],
  "kaznmu": [
    "2027-04-25"
  ],
  "amu": [
    "2027-04-25"
  ],
  "kmu": [
    "2027-04-25"
  ],
  "wkmu": [
    "2027-04-25"
  ],
  "abaiuniver": [
    "2027-04-25"
  ],
  "ablaikhan": [
    "2027-04-25"
  ],
  "aues": [
    "2027-04-25"
  ],
  "auezov": [
    "2027-04-25"
  ],
  "ktu": [
    "2027-04-25"
  ],
  "kazatu": [
    "2027-04-25"
  ]
};

export const IMPORTED_PROGRAMS: Program[] = [
  {
    "id": "mit",
    "name": "Бакалавриат — инженерия",
    "org": "Massachusetts Institute of Technology",
    "country": "US",
    "city": "Cambridge, MA",
    "level": "bachelor",
    "fields": [
      "engineering",
      "computer_science",
      "programming",
      "natural_sciences",
      "business",
      "architecture"
    ],
    "language": [
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": true
      },
      {
        "id": "ielts",
        "kind": "language",
        "label": "IELTS 7",
        "value": 7,
        "required": false
      },
      {
        "id": "sat",
        "kind": "exam",
        "label": "SAT",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "ielts_exam",
      "sat_exam",
      "docs_translate",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-01-04",
      "confidence": "derived",
      "source_id": "src:mit",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://mitadmissions.org/apply/firstyear/deadlines-requirements/",
    "confidence": "verified",
    "notes": "MIT не публикует минимальный SAT. Публикует middle 50% диапазон поступивших. IELTS не обязателен при обучении на английском. Источник о сроках: «Early Action — 1 ноября (решение в середине декабря). Regular Action — 4 января (решение в середине марта). Тесты: до 30 ноября для EA, до 31 декабря для RA. Языковой тест для RA — до 31 января. Финпомощь: 30 ноября (EA), 15 февраля (RA). Ответ поступившего — до 1 мая. Взнос 75 USD»"
  },
  {
    "id": "icl",
    "name": "Бакалавриат — инженерия",
    "org": "Imperial College London",
    "country": "GB",
    "city": "London",
    "level": "bachelor",
    "fields": [
      "engineering",
      "computer_science",
      "programming",
      "medicine",
      "natural_sciences",
      "business"
    ],
    "language": [
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": true
      },
      {
        "id": "sat",
        "kind": "exam",
        "label": "SAT",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "sat_exam",
      "docs_translate",
      "ucas_apply"
    ],
    "application_deadline": {
      "date": "2027-01-13",
      "confidence": "verified",
      "source_id": "src:icl",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://www.imperial.ac.uk/study/apply/undergraduate/entry-requirements/",
    "confidence": "verified",
    "notes": "SAT/GPA не используются. Нужны A-level / IB. IELTS минимум публикуется по факультетам. Источник о сроках: «13 января 2027, 18:00 UK (UCAS)»"
  },
  {
    "id": "oxford",
    "name": "Бакалавриат — гуманитарные",
    "org": "University of Oxford",
    "country": "GB",
    "city": "Oxford",
    "level": "bachelor",
    "fields": [
      "humanities",
      "medicine",
      "law",
      "natural_sciences",
      "engineering",
      "economics"
    ],
    "language": [
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": true
      },
      {
        "id": "sat",
        "kind": "exam",
        "label": "SAT",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "sat_exam",
      "docs_translate",
      "ucas_apply"
    ],
    "application_deadline": {
      "date": "2026-10-15",
      "confidence": "verified",
      "source_id": "src:oxford",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://www.ox.ac.uk/admissions/undergraduate/applying-to-oxford",
    "confidence": "verified",
    "notes": "Ранний дедлайн UCAS. Дополнительно вступительные тесты и собеседование. SAT не используется. Источник о сроках: «15 октября 2026, 18:00 UK (UCAS)»"
  },
  {
    "id": "stanford",
    "name": "Бакалавриат — IT и информатика",
    "org": "Stanford University",
    "country": "US",
    "city": "Stanford, CA",
    "level": "bachelor",
    "fields": [
      "computer_science",
      "programming",
      "engineering",
      "business",
      "medicine",
      "humanities"
    ],
    "language": [
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": true
      },
      {
        "id": "sat",
        "kind": "exam",
        "label": "SAT",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "sat_exam",
      "docs_translate",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-01-05",
      "confidence": "derived",
      "source_id": "src:stanford",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://admission.stanford.edu/apply/deadlines/",
    "confidence": "verified",
    "notes": "Минимального SAT нет. Test-optional политику проверять ежегодно. Источник о сроках: «Restrictive Early Action — 15 ОКТЯБРЯ (портфолио по искусству до 20 октября), решения в середине декабря. Regular Decision — 5 января, решения в начале апреля. Подача до 23:59 по местному времени заявителя. Приоритет по финпомощи для REA — 15 ноября»"
  },
  {
    "id": "harvard",
    "name": "Бакалавриат — гуманитарные",
    "org": "Harvard University",
    "country": "US",
    "city": "Cambridge, MA",
    "level": "bachelor",
    "fields": [
      "humanities",
      "law",
      "medicine",
      "business",
      "natural_sciences"
    ],
    "language": [
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": true
      },
      {
        "id": "sat",
        "kind": "exam",
        "label": "SAT",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "sat_exam",
      "docs_translate",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-01-01",
      "confidence": "derived",
      "source_id": "src:harvard",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://college.harvard.edu/admissions/apply/application-timeline",
    "confidence": "verified",
    "notes": "Минимального SAT нет. Значительная финансовая помощь международным студентам. Источник о сроках: «Restrictive Early Action — 1 ноября. Regular Decision — 1 января. Дедлайны одинаковы для граждан США и иностранцев. Школьным консультантам даётся дополнительная неделя на отправку сопроводительных материалов»"
  },
  {
    "id": "cambridge",
    "name": "Бакалавриат — естественные науки",
    "org": "University of Cambridge",
    "country": "GB",
    "city": "Cambridge",
    "level": "bachelor",
    "fields": [
      "natural_sciences",
      "engineering",
      "medicine",
      "humanities",
      "mathematics"
    ],
    "language": [
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": true
      },
      {
        "id": "sat",
        "kind": "exam",
        "label": "SAT",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "sat_exam",
      "docs_translate",
      "ucas_apply"
    ],
    "application_deadline": {
      "date": "2026-10-15",
      "confidence": "verified",
      "source_id": "src:cambridge",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://www.undergraduate.study.cam.ac.uk/applying",
    "confidence": "verified",
    "notes": "Ранний дедлайн UCAS + отдельная анкета вуза. SAT не используется. Источник о сроках: «15 октября 2026, 18:00 UK (UCAS)»"
  },
  {
    "id": "eth",
    "name": "Бакалавриат — инженерия",
    "org": "ETH Zürich",
    "country": "CH",
    "city": "Zürich",
    "level": "bachelor",
    "fields": [
      "engineering",
      "computer_science",
      "programming",
      "natural_sciences",
      "architecture"
    ],
    "language": [
      "de"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "de",
        "kind": "language",
        "label": "Язык обучения: немецкий",
        "required": true
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "docs_translate",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2026-03-31",
      "confidence": "last_cycle",
      "source_id": "src:eth",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://ethz.ch/en/studies/registration-application/bachelor.html",
    "confidence": "verified",
    "notes": "ВАЖНО: бакалавриат ведётся на НЕМЕЦКОМ. Нужен немецкий C1, не IELTS. Для казахстанцев обычно требуется вступительный экзамен. Источник о сроках: «31 марта 2026 (подача), экзамен 18–28 января 2027, старт осенью 2027»"
  },
  {
    "id": "nus",
    "name": "Бакалавриат — инженерия",
    "org": "National University of Singapore",
    "country": "SG",
    "city": "Singapore",
    "level": "bachelor",
    "fields": [
      "engineering",
      "computer_science",
      "programming",
      "medicine",
      "business",
      "law",
      "natural_sciences"
    ],
    "language": [
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": true
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "docs_translate",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-02-17",
      "confidence": "verified",
      "source_id": "src:nus",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://www.nus.edu.sg/oam/apply-to-nus/international-qualifications",
    "confidence": "verified",
    "notes": "Принимает международные квалификации. Аттестат РК обычно требует дополнительного года или foundation. Источник о сроках: «Приём на 2027/28 для международных квалификаций (включая IB): 16 ДЕКАБРЯ 2026 – 17 ФЕВРАЛЯ 2027. Результаты — онлайн, большинство узнаёт к июлю; сдающие IB в мае 2027 получают ответ к третьей неделе июля 2027. Финальные результаты нужно загрузить в течение 3 дней после их публикации»"
  },
  {
    "id": "ucl",
    "name": "Бакалавриат — медицина",
    "org": "University College London",
    "country": "GB",
    "city": "London",
    "level": "bachelor",
    "fields": [
      "medicine",
      "engineering",
      "architecture",
      "humanities",
      "economics",
      "law"
    ],
    "language": [
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": true
      },
      {
        "id": "sat",
        "kind": "exam",
        "label": "SAT",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "sat_exam",
      "docs_translate",
      "ucas_apply"
    ],
    "application_deadline": {
      "date": "2027-01-13",
      "confidence": "verified",
      "source_id": "src:ucl",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://www.ucl.ac.uk/prospective-students/undergraduate/application-and-entry",
    "confidence": "verified",
    "notes": "SAT не используется. IELTS по уровням: Standard / Good / Advanced в зависимости от программы. Источник о сроках: «13 января 2027, 18:00 UK (UCAS)»"
  },
  {
    "id": "caltech",
    "name": "Бакалавриат — естественные науки",
    "org": "California Institute of Technology",
    "country": "US",
    "city": "Pasadena, CA",
    "level": "bachelor",
    "fields": [
      "natural_sciences",
      "engineering",
      "computer_science",
      "programming",
      "mathematics"
    ],
    "language": [
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": true
      },
      {
        "id": "sat",
        "kind": "exam",
        "label": "SAT",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "sat_exam",
      "docs_translate",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2026-12-31",
      "confidence": "verified",
      "source_id": "src:caltech",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://www.admissions.caltech.edu/apply/first-year-applicants/",
    "confidence": "verified",
    "notes": "Очень маленький набор. Сильная математика и физика обязательны. Источник о сроках: «Приём на осень 2027: QuestBridge — 31 октября 2026; Early Action — 30 ноября 2026; Regular Decision — 31 декабря 2026. К этим датам должны прийти и результаты тестов»"
  },
  {
    "id": "princeton",
    "name": "Бакалавриат — гуманитарные",
    "org": "Princeton University",
    "country": "US",
    "city": "Princeton, NJ",
    "level": "bachelor",
    "fields": [
      "humanities",
      "mathematics",
      "engineering",
      "economics",
      "natural_sciences"
    ],
    "language": [
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": true
      },
      {
        "id": "sat",
        "kind": "exam",
        "label": "SAT",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "sat_exam",
      "docs_translate",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-01-01",
      "confidence": "derived",
      "source_id": "src:princeton",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://admission.princeton.edu/how-apply/application-deadlines",
    "confidence": "verified",
    "notes": "Щедрая финансовая помощь международным студентам. Источник о сроках: «Single-Choice Early Action — 1 ноября (решение в середине декабря). Regular Decision — 1 января (решение в конце марта). Ответ до 1 мая. Финпомощь: 9 ноября (EA), 1 февраля (RD). ОГРАНИЧЕНИЕ: подав на SCEA, нельзя подавать ни в одну другую раннюю программу частных вузов США»"
  },
  {
    "id": "cornell",
    "name": "Бакалавриат — сельское хозяйство",
    "org": "Cornell University",
    "country": "US",
    "city": "Ithaca, NY",
    "level": "bachelor",
    "fields": [
      "agriculture",
      "engineering",
      "architecture",
      "business",
      "humanities",
      "veterinary"
    ],
    "language": [
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": true
      },
      {
        "id": "ielts",
        "kind": "language",
        "label": "IELTS 7",
        "value": 7,
        "required": false
      },
      {
        "id": "sat",
        "kind": "exam",
        "label": "SAT",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "ielts_exam",
      "sat_exam",
      "docs_translate",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-01-02",
      "confidence": "derived",
      "source_id": "src:cornell",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://admissions.cornell.edu/apply/first-year-applicants",
    "confidence": "verified",
    "notes": "Единственный в Лиге Плюща с сильной агрономией и ветеринарией. Источник о сроках: «Early Decision — 1 ноября (остальные материалы до 13 ноября, решение в середине декабря). Regular Decision — 2 января (материалы до 19 января, решение в конце марта). ВАЖНО: финпомощь для ИНОСТРАНЦЕВ — 1 ноября (ED) и 2 января (RD), то есть раньше, чем для американцев. ED — обязывающий план: при поступлении нужно отозвать все остальные заявки»"
  },
  {
    "id": "jhu",
    "name": "Бакалавриат — медицина",
    "org": "Johns Hopkins University",
    "country": "US",
    "city": "Baltimore, MD",
    "level": "bachelor",
    "fields": [
      "medicine",
      "natural_sciences",
      "engineering",
      "humanities"
    ],
    "language": [
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": true
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "docs_translate",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-01-02",
      "confidence": "verified",
      "source_id": "src:jhu",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://apply.jhu.edu/application-process/deadlines-requirements/",
    "confidence": "verified",
    "notes": "Сильнейшая медицина и биомедицина в США. Бакалавриат — premed, не сама медицина. Источник о сроках: «Early Decision I — 1 ноября 2026 (решение 11 декабря 2026). Early Decision II — 2 января 2027 (решение 12 февраля 2027). Regular Decision — 2 января 2027 (решение 24 марта 2027). Финпомощь: 15 ноября, 15 января. Взнос 70 USD»"
  },
  {
    "id": "berkeley",
    "name": "Бакалавриат — инженерия",
    "org": "University of California, Berkeley",
    "country": "US",
    "city": "Berkeley, CA",
    "level": "bachelor",
    "fields": [
      "engineering",
      "computer_science",
      "programming",
      "economics",
      "natural_sciences",
      "law"
    ],
    "language": [
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": true
      },
      {
        "id": "ielts",
        "kind": "language",
        "label": "IELTS 6.5",
        "value": 6.5,
        "required": false
      },
      {
        "id": "sat",
        "kind": "exam",
        "label": "SAT",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "ielts_exam",
      "sat_exam",
      "docs_translate",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2026-11-30",
      "confidence": "derived",
      "source_id": "src:berkeley",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://admissions.berkeley.edu/apply/application-deadlines/",
    "confidence": "verified",
    "notes": "Система UC не имеет Early Decision/Action. Одна анкета на все кампусы UC. Источник о сроках: «Единое окно подачи системы UC: 1 октября – 30 ноября для осеннего набора. Готовить заявку можно с 1 августа. У UC НЕТ Early Decision и Early Action. Языковое требование закрыть до 31 января»"
  },
  {
    "id": "cmu",
    "name": "Бакалавриат — IT и информатика",
    "org": "Carnegie Mellon University",
    "country": "US",
    "city": "Pittsburgh, PA",
    "level": "bachelor",
    "fields": [
      "computer_science",
      "programming",
      "engineering",
      "arts",
      "business"
    ],
    "language": [
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": true
      },
      {
        "id": "ielts",
        "kind": "language",
        "label": "IELTS 7.5",
        "value": 7.5,
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "ielts_exam",
      "docs_translate",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-01-04",
      "confidence": "derived",
      "source_id": "src:cmu",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://www.cmu.edu/admission/admission/apply",
    "confidence": "verified",
    "notes": "CS входит в мировой топ. Также сильные драма и дизайн — редкое сочетание. Источник о сроках: «Early Decision — 2 ноября (решение до 15 декабря, подтверждение до 1 февраля). Regular Decision — 4 января (решение до 1 апреля, подтверждение до 1 мая). Для School of Drama и School of Music — 1 декабря. Early Decision недоступен для School of Drama, BXA Design и School of Music»"
  },
  {
    "id": "umich",
    "name": "Бакалавриат — инженерия",
    "org": "University of Michigan",
    "country": "US",
    "city": "Ann Arbor, MI",
    "level": "bachelor",
    "fields": [
      "engineering",
      "business",
      "medicine",
      "humanities",
      "natural_sciences"
    ],
    "language": [
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": true
      },
      {
        "id": "ielts",
        "kind": "language",
        "label": "IELTS 7",
        "value": 7,
        "required": false
      },
      {
        "id": "sat",
        "kind": "exam",
        "label": "SAT",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "ielts_exam",
      "sat_exam",
      "docs_translate",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-02-01",
      "confidence": "derived",
      "source_id": "src:umich",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://admissions.umich.edu/apply/first-year-applicants/application-deadlines",
    "confidence": "verified",
    "notes": "Крупный государственный вуз, широкий выбор направлений, дешевле частных. Источник о сроках: «ДЛЯ ИНОСТРАНЦЕВ: Early Action и Early Decision — 1 ноября; Regular Decision на осенний семестр — 1 февраля. Баллы SAT/ACT для Early Action самостоятельно указать до 1 ноября. ВАЖНО: иностранные студенты на временной визе НЕ получают финансовую помощь и оплачивают полную стоимость обучения»"
  },
  {
    "id": "purdue",
    "name": "Бакалавриат — инженерия",
    "org": "Purdue University",
    "country": "US",
    "city": "West Lafayette, IN",
    "level": "bachelor",
    "fields": [
      "engineering",
      "computer_science",
      "programming",
      "agriculture",
      "natural_sciences"
    ],
    "language": [
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": true
      },
      {
        "id": "sat",
        "kind": "exam",
        "label": "SAT",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "sat_exam",
      "docs_translate",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2026-11-01",
      "confidence": "derived",
      "source_id": "src:purdue",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://www.admissions.purdue.edu/apply/deadlines.php",
    "confidence": "verified",
    "notes": "Сильная инженерия при заметно более низкой стоимости, чем у частных вузов. Источник о сроках: «Early Action — 1 ноября. Подача по Early Action даёт полное рассмотрение на поступление, стипендии за заслуги и John Martinson Honors College. Дедлайны — 23:59 по восточному времени. Обработка документов занимает до двух недель»"
  },
  {
    "id": "lse",
    "name": "Бакалавриат — экономика",
    "org": "London School of Economics",
    "country": "GB",
    "city": "London",
    "level": "bachelor",
    "fields": [
      "economics",
      "law",
      "business",
      "humanities"
    ],
    "language": [
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": true
      },
      {
        "id": "sat",
        "kind": "exam",
        "label": "SAT",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "sat_exam",
      "docs_translate",
      "ucas_apply"
    ],
    "application_deadline": {
      "date": "2027-01-13",
      "confidence": "verified",
      "source_id": "src:lse",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://www.lse.ac.uk/study-at-lse/Undergraduate/entry-requirements",
    "confidence": "verified",
    "notes": "Экономика, политика, право. SAT не используется. Источник о сроках: «13 января 2027, 18:00 UK (UCAS)»"
  },
  {
    "id": "edinburgh",
    "name": "Бакалавриат — медицина",
    "org": "University of Edinburgh",
    "country": "GB",
    "city": "Edinburgh",
    "level": "bachelor",
    "fields": [
      "medicine",
      "veterinary",
      "humanities",
      "engineering",
      "natural_sciences"
    ],
    "language": [
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": true
      },
      {
        "id": "sat",
        "kind": "exam",
        "label": "SAT",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "sat_exam",
      "docs_translate",
      "ucas_apply"
    ],
    "application_deadline": {
      "date": "2027-01-13",
      "confidence": "verified",
      "source_id": "src:edinburgh",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://www.ed.ac.uk/studying/undergraduate/applying",
    "confidence": "verified",
    "notes": "Есть и медицина, и ветеринария — у них ранний дедлайн UCAS. Источник о сроках: «15 октября 2026 для медицины и ветеринарии; 13 января 2027 для остальных»"
  },
  {
    "id": "kcl",
    "name": "Бакалавриат — медицина",
    "org": "King's College London",
    "country": "GB",
    "city": "London",
    "level": "bachelor",
    "fields": [
      "medicine",
      "law",
      "humanities",
      "natural_sciences",
      "education"
    ],
    "language": [
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": true
      },
      {
        "id": "sat",
        "kind": "exam",
        "label": "SAT",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "sat_exam",
      "docs_translate",
      "ucas_apply"
    ],
    "application_deadline": {
      "date": "2027-01-13",
      "confidence": "verified",
      "source_id": "src:kcl",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://www.kcl.ac.uk/study/undergraduate/how-to-apply",
    "confidence": "verified",
    "notes": "Сильные медицина и право. Источник о сроках: «15 октября 2026 для медицины и стоматологии; 13 января 2027 для остальных»"
  },
  {
    "id": "warwick",
    "name": "Бакалавриат — математика",
    "org": "University of Warwick",
    "country": "GB",
    "city": "Coventry",
    "level": "bachelor",
    "fields": [
      "mathematics",
      "economics",
      "business",
      "engineering",
      "computer_science",
      "programming"
    ],
    "language": [
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": true
      },
      {
        "id": "sat",
        "kind": "exam",
        "label": "SAT",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "sat_exam",
      "docs_translate",
      "ucas_apply"
    ],
    "application_deadline": {
      "date": "2027-01-13",
      "confidence": "verified",
      "source_id": "src:warwick",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://warwick.ac.uk/study/undergraduate/apply/",
    "confidence": "verified",
    "notes": "Математика и экономика. Источник о сроках: «13 января 2027, 18:00 UK (UCAS)»"
  },
  {
    "id": "glasgow",
    "name": "Бакалавриат — медицина",
    "org": "University of Glasgow",
    "country": "GB",
    "city": "Glasgow",
    "level": "bachelor",
    "fields": [
      "medicine",
      "veterinary",
      "engineering",
      "humanities",
      "natural_sciences"
    ],
    "language": [
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": true
      },
      {
        "id": "sat",
        "kind": "exam",
        "label": "SAT",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "sat_exam",
      "docs_translate",
      "ucas_apply"
    ],
    "application_deadline": {
      "date": "2027-01-13",
      "confidence": "verified",
      "source_id": "src:glasgow",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://www.gla.ac.uk/undergraduate/entryrequirements/",
    "confidence": "verified",
    "notes": "Один из немногих с ветеринарией. Источник о сроках: «15 октября 2026 для медицины и ветеринарии; 13 января 2027 для остальных»"
  },
  {
    "id": "manchester",
    "name": "Бакалавриат — инженерия",
    "org": "University of Manchester",
    "country": "GB",
    "city": "Manchester",
    "level": "bachelor",
    "fields": [
      "engineering",
      "medicine",
      "computer_science",
      "programming",
      "business",
      "humanities"
    ],
    "language": [
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": true
      },
      {
        "id": "ielts",
        "kind": "language",
        "label": "IELTS 5.5",
        "value": 5.5,
        "required": false
      },
      {
        "id": "sat",
        "kind": "exam",
        "label": "SAT",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "ielts_exam",
      "sat_exam",
      "docs_translate",
      "ucas_apply"
    ],
    "application_deadline": {
      "date": "2027-01-13",
      "confidence": "verified",
      "source_id": "src:manchester",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://www.manchester.ac.uk/study/undergraduate/applications/",
    "confidence": "verified",
    "notes": "Широкий выбор, крупный кампус. Источник о сроках: «15 октября 2026 для медицины и стоматологии; 13 января 2027 для остальных»"
  },
  {
    "id": "bristol",
    "name": "Бакалавриат — инженерия",
    "org": "University of Bristol",
    "country": "GB",
    "city": "Bristol",
    "level": "bachelor",
    "fields": [
      "engineering",
      "medicine",
      "veterinary",
      "natural_sciences",
      "law"
    ],
    "language": [
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": true
      },
      {
        "id": "sat",
        "kind": "exam",
        "label": "SAT",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "sat_exam",
      "docs_translate",
      "ucas_apply"
    ],
    "application_deadline": {
      "date": "2027-01-13",
      "confidence": "verified",
      "source_id": "src:bristol",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://www.bristol.ac.uk/study/undergraduate/apply/",
    "confidence": "verified",
    "notes": "Инженерия и медицина. Источник о сроках: «15 октября 2026 для медицины и ветеринарии; 13 января 2027 для остальных»"
  },
  {
    "id": "epfl",
    "name": "Бакалавриат — инженерия",
    "org": "EPFL",
    "country": "CH",
    "city": "Lausanne",
    "level": "bachelor",
    "fields": [
      "engineering",
      "computer_science",
      "programming",
      "architecture",
      "natural_sciences"
    ],
    "language": [
      "fr",
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "fr",
        "kind": "language",
        "label": "Язык обучения: французский",
        "required": false
      },
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "docs_translate",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-04-30",
      "confidence": "derived",
      "source_id": "src:epfl",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://www.epfl.ch/education/bachelor/admission-criteria/",
    "confidence": "verified",
    "notes": "Бакалавриат преимущественно на ФРАНЦУЗСКОМ. Английский — со второго курса и в магистратуре. Источник о сроках: «Подача открывается в середине ноября, закрывается 30 АПРЕЛЯ. Взнос: 150 CHF для иностранных аттестатов (50 CHF для швейцарских), невозвратный. Второй этап документов — до 10 июля, продление до 30 сентября. Решение о приёме действует ТОЛЬКО на ближайший учебный год»"
  },
  {
    "id": "tum",
    "name": "Бакалавриат — инженерия",
    "org": "Technical University of Munich",
    "country": "DE",
    "city": "München",
    "level": "bachelor",
    "fields": [
      "engineering",
      "computer_science",
      "programming",
      "natural_sciences",
      "medicine"
    ],
    "language": [
      "de",
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "de",
        "kind": "language",
        "label": "Язык обучения: немецкий",
        "required": false
      },
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "docs_translate",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-03-31",
      "confidence": "derived",
      "source_id": "src:tum",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://www.tum.de/en/studies/application",
    "confidence": "verified",
    "notes": "Большинство программ бакалавриата на НЕМЕЦКОМ (нужен DSH/TestDaF). Английские программы есть, но их мало. Источник о сроках: «Зимний семестр: 01.10–31.03. Летний семестр: 01.04–30.09. Точные окна подачи различаются по программам — смотреть на странице конкретной программы. Иностранцам нужно заранее заложить время на VPD через uni-assist»"
  },
  {
    "id": "lmu",
    "name": "Бакалавриат — медицина",
    "org": "LMU Munich",
    "country": "DE",
    "city": "München",
    "level": "bachelor",
    "fields": [
      "medicine",
      "humanities",
      "law",
      "natural_sciences",
      "economics"
    ],
    "language": [
      "de"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "de",
        "kind": "language",
        "label": "Язык обучения: немецкий",
        "required": true
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "docs_translate",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-07-15",
      "confidence": "derived",
      "source_id": "src:lmu",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://www.lmu.de/en/study/study-offerings/index.html",
    "confidence": "verified",
    "notes": "Медицина только на немецком, очень высокий конкурс (NC). Для иностранцев обычно нужен Studienkolleg. Источник о сроках: «Зимний семестр — до 15 ИЮЛЯ. Летний семестр — до 15 ЯНВАРЯ. Университет прямо предупреждает: пропуск дедлайна означает потерю как минимум целого семестра»"
  },
  {
    "id": "heidelberg",
    "name": "Бакалавриат — медицина",
    "org": "Heidelberg University",
    "country": "DE",
    "city": "Heidelberg",
    "level": "bachelor",
    "fields": [
      "medicine",
      "natural_sciences",
      "humanities",
      "law"
    ],
    "language": [
      "de"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "de",
        "kind": "language",
        "label": "Язык обучения: немецкий",
        "required": true
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "docs_translate",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-07-15",
      "confidence": "derived",
      "source_id": "src:heidelberg",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://www.uni-heidelberg.de/en/study/application",
    "confidence": "verified",
    "notes": "Старейший вуз Германии, сильнейшая медицина. Немецкий обязателен. Источник о сроках: «Программы без ограничения приёма: зимний семестр 01.06–31.10, летний 01.12–30.04. Программы с ограничением или вступительным экзаменом: зимний 01.06–15.07, летний 01.12–15.01. МЕДИЦИНА, ФАРМАЦИЯ, СТОМАТОЛОГИЯ для иностранцев не из ЕС: зимний 01.06–15.07, подача напрямую в Гейдельберг; летнего набора нет. Если дедлайн выпал на выходной, он НЕ переносится»"
  },
  {
    "id": "rwth",
    "name": "Бакалавриат — инженерия",
    "org": "RWTH Aachen",
    "country": "DE",
    "city": "Aachen",
    "level": "bachelor",
    "fields": [
      "engineering",
      "computer_science",
      "programming",
      "natural_sciences"
    ],
    "language": [
      "de",
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "de",
        "kind": "language",
        "label": "Язык обучения: немецкий",
        "required": false
      },
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "docs_translate",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-07-15",
      "confidence": "derived",
      "source_id": "src:rwth",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://www.rwth-aachen.de/go/id/bdcb",
    "confidence": "verified",
    "notes": "Лучшая инженерия Германии. Бакалавриат в основном на немецком. Источник о сроках: «Подача через RWTHonline, документы должны быть полными и в срок; точные даты различаются по программам. Зимний семестр — стандартно до 15 июля, летний — до 15 января»"
  },
  {
    "id": "tudelft",
    "name": "Бакалавриат — инженерия",
    "org": "TU Delft",
    "country": "NL",
    "city": "Delft",
    "level": "bachelor",
    "fields": [
      "engineering",
      "architecture",
      "computer_science",
      "programming",
      "natural_sciences"
    ],
    "language": [
      "en",
      "nl"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": false
      },
      {
        "id": "nl",
        "kind": "language",
        "label": "Язык обучения: нидерландский",
        "required": false
      },
      {
        "id": "ielts",
        "kind": "language",
        "label": "IELTS 5.5",
        "value": 5.5,
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "ielts_exam",
      "docs_translate",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-04-01",
      "confidence": "derived",
      "source_id": "src:tudelft",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://www.tudelft.nl/en/education/admission-and-application/bsc-international-diploma",
    "confidence": "verified",
    "notes": "Есть англоязычные бакалавриаты. Numerus fixus на популярных программах — дедлайн ранний и не сдвигается. Источник о сроках: «Обычные программы бакалавриата: подача 15 октября – 1 АПРЕЛЯ (23:59 CEST). Программы с ограниченным набором (numerus clausus): 15 октября – 15 ЯНВАРЯ (23:59 CET). ВАЖНО: numerus clausus действует для Aerospace Engineering, Architecture/Urbanism/Building Sciences, Clinical Technology и Computer Science & Engineering — то есть как раз для англоязычных программ. Подтверждение места — до 1 июня, оплата — до 1 июля, семестр начинается в первую неделю сентября. Неполные заявки не рассматриваются»"
  },
  {
    "id": "uva",
    "name": "Бакалавриат — гуманитарные",
    "org": "University of Amsterdam",
    "country": "NL",
    "city": "Amsterdam",
    "level": "bachelor",
    "fields": [
      "humanities",
      "economics",
      "natural_sciences",
      "law",
      "business"
    ],
    "language": [
      "en",
      "nl"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": false
      },
      {
        "id": "nl",
        "kind": "language",
        "label": "Язык обучения: нидерландский",
        "required": false
      },
      {
        "id": "ielts",
        "kind": "language",
        "label": "IELTS 6.5",
        "value": 6.5,
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "ielts_exam",
      "docs_translate",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-05-01",
      "confidence": "derived",
      "source_id": "src:uva",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://www.uva.nl/en/education/bachelor-s/application-and-admission/application-and-admission.html",
    "confidence": "verified",
    "notes": "Много англоязычных программ, относительно доступная стоимость для не-ЕС. Источник о сроках: «Программы с отбором и квотой: 15 января – 1 февраля. Остальные: 1 апреля (рекомендуемый), 1 мая (окончательный). Университет настоятельно советует подавать до 1 апреля, если нужна виза или общежитие»"
  },
  {
    "id": "karolinska",
    "name": "Бакалавриат — медицина",
    "org": "Karolinska Institutet",
    "country": "SE",
    "city": "Stockholm",
    "level": "bachelor",
    "fields": [
      "medicine"
    ],
    "language": [
      "sv",
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "sv",
        "kind": "language",
        "label": "Язык обучения: шведский",
        "required": false
      },
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "docs_translate",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-04-15",
      "confidence": "verified",
      "source_id": "src:karolinska",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://education.ki.se/admissions",
    "confidence": "verified",
    "notes": "Профильный медицинский вуз мирового уровня. Бакалавриат по медицине — на ШВЕДСКОМ. Англоязычные — магистратура. Источник о сроках: «Набор 2027, ПЕРВЫЙ РАУНД (приоритет для не-ЕС/ЕЭП): подача 16 октября 2026 – 15 ЯНВАРЯ 2027, документы до 1 февраля 2027. ВТОРОЙ РАУНД (приоритет для ЕС/ЕЭП): 15 марта – 15 апреля 2027, документы до 21 июня 2027. Абитуриентам из Казахстана нужен ПЕРВЫЙ раунд»"
  },
  {
    "id": "sorbonne",
    "name": "Бакалавриат — гуманитарные",
    "org": "Sorbonne Université",
    "country": "FR",
    "city": "Paris",
    "level": "bachelor",
    "fields": [
      "humanities",
      "natural_sciences",
      "medicine",
      "law"
    ],
    "language": [
      "fr"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "fr",
        "kind": "language",
        "label": "Язык обучения: французский",
        "required": true
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "docs_translate",
      "apply_form"
    ],
    "official_url": "https://www.sorbonne-universite.fr/en/education",
    "confidence": "verified",
    "notes": "Обучение на ФРАНЦУЗСКОМ. Для казахстанцев — процедура Campus France, подавать за год. Источник о сроках: «Начинать процедуру Campus France нужно в НОЯБРЕ года, предшествующего поступлению. Точные даты окна Études en France публикуются на pastel.diplomatie.gouv.fr»"
  },
  {
    "id": "bocconi",
    "name": "Бакалавриат — экономика",
    "org": "Bocconi University",
    "country": "IT",
    "city": "Milano",
    "level": "bachelor",
    "fields": [
      "economics",
      "business",
      "law",
      "computer_science",
      "programming"
    ],
    "language": [
      "en",
      "it"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": false
      },
      {
        "id": "it",
        "kind": "language",
        "label": "Язык обучения: итальянский",
        "required": false
      },
      {
        "id": "sat",
        "kind": "exam",
        "label": "SAT",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "sat_exam",
      "docs_translate",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-01-26",
      "confidence": "verified",
      "source_id": "src:bocconi",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://www.unibocconi.it/en/programs/bachelor-science/admissions",
    "confidence": "verified",
    "notes": "Экономика и финансы, программы на английском. Ранние раунды дают больше шансов на стипендию. Источник о сроках: «НА 2027/28 ДВА РАУНДА: Early — 2–29 сентября 2026 до 15:00 по итальянскому времени (результат в середине ноября 2026); Winter — 25 ноября 2026 – 26 января 2027 до 15:00 (результат в середине марта 2027)»"
  },
  {
    "id": "polimi",
    "name": "Бакалавриат — инженерия",
    "org": "Politecnico di Milano",
    "country": "IT",
    "city": "Milano",
    "level": "bachelor",
    "fields": [
      "engineering",
      "architecture",
      "design",
      "ux"
    ],
    "language": [
      "en",
      "it"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": false
      },
      {
        "id": "it",
        "kind": "language",
        "label": "Язык обучения: итальянский",
        "required": false
      },
      {
        "id": "sat",
        "kind": "exam",
        "label": "SAT",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "sat_exam",
      "docs_translate",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2026-09-09",
      "confidence": "last_cycle",
      "source_id": "src:polimi",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://www.polimi.it/en/programmes/admission",
    "confidence": "verified",
    "notes": "Дизайн и архитектура мирового уровня, англоязычные программы, умеренная стоимость. Источник о сроках: «Приём на 2026/27 в четыре волны: ранняя запись 4 мая – 11 июня 2026 (для сдавших TOL на 75/100 и выше); основная запись 15 июня – 15 июля 2026; оставшиеся места 20 июля – 5 августа 2026; дополнительные места 24 августа – 9 сентября 2026»"
  },
  {
    "id": "tuwien",
    "name": "Бакалавриат — инженерия",
    "org": "TU Wien",
    "country": "AT",
    "city": "Wien",
    "level": "bachelor",
    "fields": [
      "engineering",
      "computer_science",
      "programming",
      "architecture",
      "natural_sciences"
    ],
    "language": [
      "de"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "de",
        "kind": "language",
        "label": "Язык обучения: немецкий",
        "required": true
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "docs_translate",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-07-16",
      "confidence": "derived",
      "source_id": "src:tuwien",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://www.tuwien.at/en/studies/admission",
    "confidence": "verified",
    "notes": "Бакалавриат на немецком. Обучение для не-ЕС недорогое по европейским меркам. Источник о сроках: «Зимний семестр 2026/27: граждане НЕ из ЕС/ЕЭП — 16 ЯНВАРЯ – 15 ИЮЛЯ (для граждан ЕС/ЕЭП февраль–июль). Летний семестр 2027: не из ЕС/ЕЭП — 16 июля – 15 января (ЕС/ЕЭП август–январь). У иностранцев окно открывается РАНЬШЕ и закрывается в тот же день»"
  },
  {
    "id": "charles",
    "name": "Бакалавриат — медицина",
    "org": "Charles University",
    "country": "CZ",
    "city": "Praha",
    "level": "bachelor",
    "fields": [
      "medicine",
      "humanities",
      "law",
      "natural_sciences"
    ],
    "language": [
      "cs",
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "cs",
        "kind": "language",
        "label": "Язык обучения: чешский",
        "required": false
      },
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "docs_translate",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2026-09-23",
      "confidence": "verified",
      "source_id": "src:charles",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://cuni.cz/UKEN-1.html",
    "confidence": "verified",
    "notes": "Есть медицина на АНГЛИЙСКОМ (платно). На чешском — бесплатно. Популярное направление у студентов из СНГ. Источник о сроках: «5 сентября 2026 (подача открылась 1 декабря 2025). Экзамены 16 сентября 2026, дополнительный срок 23 сентября 2026»"
  },
  {
    "id": "semmelweis",
    "name": "Бакалавриат — медицина",
    "org": "Semmelweis University",
    "country": "HU",
    "city": "Budapest",
    "level": "bachelor",
    "fields": [
      "medicine"
    ],
    "language": [
      "en",
      "hu"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": false
      },
      {
        "id": "hu",
        "kind": "language",
        "label": "Язык обучения: венгерский",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "docs_translate",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2026-05-31",
      "confidence": "last_cycle",
      "source_id": "src:semmelweis",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://semmelweis.hu/english/admissions/",
    "confidence": "verified",
    "notes": "Медицина на английском. Одно из главных направлений для абитуриентов из СНГ. Доступно по Stipendium Hungaricum. Источник о сроках: «Подача открылась 12 января 2026, дедлайн 31 МАЯ 2026. Экзамены проходят с начала марта до конца июня. Результат — в течение 2 недель после экзамена»"
  },
  {
    "id": "bme",
    "name": "Бакалавриат — инженерия",
    "org": "Budapest University of Technology (BME)",
    "country": "HU",
    "city": "Budapest",
    "level": "bachelor",
    "fields": [
      "engineering",
      "computer_science",
      "programming",
      "architecture"
    ],
    "language": [
      "en",
      "hu"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": false
      },
      {
        "id": "hu",
        "kind": "language",
        "label": "Язык обучения: венгерский",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "docs_translate",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2026-05-15",
      "confidence": "last_cycle",
      "source_id": "src:bme",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://www.bme.hu/admission",
    "confidence": "verified",
    "notes": "Инженерия на английском, входит в Stipendium Hungaricum. Источник о сроках: «Приём для платных студентов: 1 АПРЕЛЯ – 15 МАЯ 2026 на сентябрьский набор 2026. На весенний набор доступны не все программы»"
  },
  {
    "id": "uj",
    "name": "Бакалавриат — медицина",
    "org": "Jagiellonian University",
    "country": "PL",
    "city": "Kraków",
    "level": "bachelor",
    "fields": [
      "medicine",
      "humanities",
      "law",
      "natural_sciences"
    ],
    "language": [
      "pl",
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "pl",
        "kind": "language",
        "label": "Язык обучения: польский",
        "required": false
      },
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": false
      },
      {
        "id": "ielts",
        "kind": "language",
        "label": "IELTS 6.5",
        "value": 6.5,
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "ielts_exam",
      "docs_translate",
      "apply_form"
    ],
    "official_url": "https://en.uj.edu.pl/en_GB/admissions",
    "confidence": "verified",
    "notes": "Медицина на английском, старейший вуз Польши. Источник о сроках: «уточнять в системе подачи; для первокурсников первый платёж — в течение 7 дней после регистрации, второй до 15 февраля»"
  },
  {
    "id": "ntu",
    "name": "Бакалавриат — инженерия",
    "org": "Nanyang Technological University",
    "country": "SG",
    "city": "Singapore",
    "level": "bachelor",
    "fields": [
      "engineering",
      "computer_science",
      "programming",
      "business",
      "natural_sciences",
      "education"
    ],
    "language": [
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": true
      },
      {
        "id": "ielts",
        "kind": "language",
        "label": "IELTS 6",
        "value": 6,
        "required": false
      },
      {
        "id": "sat",
        "kind": "exam",
        "label": "SAT",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "ielts_exam",
      "sat_exam",
      "docs_translate",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-03-19",
      "confidence": "verified",
      "source_id": "src:ntu",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://www.ntu.edu.sg/admissions/undergraduate/admission-guide",
    "confidence": "verified",
    "notes": "Инженерия и бизнес. Аттестат РК оценивается индивидуально. Источник о сроках: «Приём на 2027/28 для обладателей международных квалификаций: 15 ОКТЯБРЯ 2026 – 19 МАРТА 2027. Точная дата закрытия различается в зависимости от типа квалификации — уточнять на странице International Qualifications»"
  },
  {
    "id": "hku",
    "name": "Бакалавриат — медицина",
    "org": "University of Hong Kong",
    "country": "HK",
    "city": "Hong Kong",
    "level": "bachelor",
    "fields": [
      "medicine",
      "law",
      "business",
      "engineering",
      "humanities"
    ],
    "language": [
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": true
      },
      {
        "id": "ielts",
        "kind": "language",
        "label": "IELTS 6.5",
        "value": 6.5,
        "required": false
      },
      {
        "id": "sat",
        "kind": "exam",
        "label": "SAT",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "ielts_exam",
      "sat_exam",
      "docs_translate",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-08-25",
      "confidence": "verified",
      "source_id": "src:hku",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://admissions.hku.hk/",
    "confidence": "verified",
    "notes": "Обучение полностью на английском, сильная медицина и право. Источник о сроках: «Набор 2026: подача открывается 23 сентября 2026; дедлайн первого раунда — 25 ноября 2026, 12:00 по гонконгскому времени; преподаватели и рекомендатели подают оценки до 1 декабря 2026; окончательное закрытие — 25 августа 2027»"
  },
  {
    "id": "hkust",
    "name": "Бакалавриат — инженерия",
    "org": "HKUST",
    "country": "HK",
    "city": "Hong Kong",
    "level": "bachelor",
    "fields": [
      "engineering",
      "computer_science",
      "programming",
      "business",
      "natural_sciences"
    ],
    "language": [
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": true
      },
      {
        "id": "sat",
        "kind": "exam",
        "label": "SAT",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "sat_exam",
      "docs_translate",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-06-30",
      "confidence": "verified",
      "source_id": "src:hkust",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://join.hkust.edu.hk/",
    "confidence": "verified",
    "notes": "Инженерия и бизнес, английский язык обучения, много стипендий для международных. Источник о сроках: «Набор 2026: система подачи открывается в начале октября; ПРИОРИТЕТНЫЙ РАУНД — 25 ноября 2026; после 26 ноября приём идёт по мере поступления заявок; офферы — конец декабря 2026; финальный дедлайн — 30 июня 2027»"
  },
  {
    "id": "utokyo",
    "name": "Бакалавриат — естественные науки",
    "org": "University of Tokyo",
    "country": "JP",
    "city": "Tokyo",
    "level": "bachelor",
    "fields": [
      "natural_sciences",
      "engineering",
      "medicine",
      "humanities",
      "law"
    ],
    "language": [
      "ja",
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "ja",
        "kind": "language",
        "label": "Язык обучения: японский",
        "required": false
      },
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": false
      },
      {
        "id": "sat",
        "kind": "exam",
        "label": "SAT",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "sat_exam",
      "docs_translate",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2025-12-09",
      "confidence": "last_cycle",
      "source_id": "src:utokyo",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://www.u-tokyo.ac.jp/en/prospective-students/",
    "confidence": "verified",
    "notes": "Обычный бакалавриат — на японском. Для иностранцев есть англоязычная программа PEAK с отдельным набором. Источник о сроках: «Цикл на сентябрь 2026: предварительная проверка права на поступление до 3 октября 2025, подача 11 ноября – 9 декабря 2025, первый этап — январь 2026, собеседования февраль–начало марта, решение 30 марта 2026, подтверждение до 7 мая 2026. КРИТИЧЕСКИ ВАЖНО: университет объявил, что набор на сентябрь 2026 — ПОСЛЕДНИЙ НАБОР НА ПРОГРАММУ PEAK»"
  },
  {
    "id": "kyoto",
    "name": "Бакалавриат — естественные науки",
    "org": "Kyoto University",
    "country": "JP",
    "city": "Kyoto",
    "level": "bachelor",
    "fields": [
      "natural_sciences",
      "engineering",
      "medicine",
      "humanities"
    ],
    "language": [
      "ja",
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "ja",
        "kind": "language",
        "label": "Язык обучения: японский",
        "required": false
      },
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": false
      },
      {
        "id": "sat",
        "kind": "exam",
        "label": "SAT",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "sat_exam",
      "docs_translate",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2026-12-03",
      "confidence": "verified",
      "source_id": "src:kyoto",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://www.kyoto-u.ac.jp/en/education-campus/admissions",
    "confidence": "verified",
    "notes": "Преимущественно японский язык. Англоязычная программа iUP — отдельный набор. Источник о сроках: «Набор на октябрь 2027: подача 2 НОЯБРЯ – 3 ДЕКАБРЯ 2026 до 17:00 по японскому времени. Результаты первого этапа 5 февраля 2027, собеседования 1–16 марта 2027, результаты второго этапа 6 апреля 2027, подтверждение зачисления до 7 мая 2027, начало учёбы 1 октября 2027. Неполные и опоздавшие заявки не рассматриваются»"
  },
  {
    "id": "snu",
    "name": "Бакалавриат — гуманитарные",
    "org": "Seoul National University",
    "country": "KR",
    "city": "Seoul",
    "level": "bachelor",
    "fields": [
      "humanities",
      "natural_sciences",
      "engineering",
      "medicine",
      "law"
    ],
    "language": [
      "ko",
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "ko",
        "kind": "language",
        "label": "Язык обучения: корейский",
        "required": false
      },
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "docs_translate",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2026-07-09",
      "confidence": "last_cycle",
      "source_id": "src:snu",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://admission.snu.ac.kr/international/",
    "confidence": "verified",
    "notes": "Для большинства программ нужен TOPIK (корейский). Доступен по Global Korea Scholarship. Источник о сроках: «Весенний набор 2027: онлайн-подача 6–9 ИЮЛЯ 2026 (открытие 6 июля 10:00, закрытие 9 июля 17:00 по корейскому времени). Рекомендательные письма — 6–10 июля 2026. Предварительное решение — 16 октября 2026 после 17:00»"
  },
  {
    "id": "bogazici",
    "name": "Бакалавриат — инженерия",
    "org": "Boğaziçi University",
    "country": "TR",
    "city": "İstanbul",
    "level": "bachelor",
    "fields": [
      "engineering",
      "computer_science",
      "programming",
      "economics",
      "education",
      "humanities"
    ],
    "language": [
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": true
      },
      {
        "id": "ielts",
        "kind": "language",
        "label": "IELTS 9",
        "value": 9,
        "required": false
      },
      {
        "id": "sat",
        "kind": "exam",
        "label": "SAT",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "ielts_exam",
      "sat_exam",
      "docs_translate",
      "apply_form"
    ],
    "official_url": "https://intl.boun.edu.tr/",
    "confidence": "verified",
    "notes": "Обучение на английском, государственный вуз, невысокая стоимость. Сильная инженерия. Источник о сроках: «Подача через Office of International Relations, контакт globalstudents@bogazici.edu.tr. Точные окна публикуются на intl.bogazici.edu.tr перед каждым набором»"
  },
  {
    "id": "metu",
    "name": "Бакалавриат — инженерия",
    "org": "Middle East Technical University (ODTÜ)",
    "country": "TR",
    "city": "Ankara",
    "level": "bachelor",
    "fields": [
      "engineering",
      "computer_science",
      "programming",
      "architecture",
      "natural_sciences"
    ],
    "language": [
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": true
      },
      {
        "id": "sat",
        "kind": "exam",
        "label": "SAT",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "sat_exam",
      "docs_translate",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2026-07-12",
      "confidence": "last_cycle",
      "source_id": "src:metu",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://oidb.metu.edu.tr/en",
    "confidence": "verified",
    "notes": "Обучение на английском. Принимает по собственному экзамену или SAT. Источник о сроках: «1 июня – 12 июля 2026 (открытие 16:00, закрытие 23:59 по турецкому времени). Подавшие A-level сначала получают статус Admission deferral, окончательная оценка после августа»"
  },
  {
    "id": "koc",
    "name": "Бакалавриат — медицина",
    "org": "Koç University",
    "country": "TR",
    "city": "İstanbul",
    "level": "bachelor",
    "fields": [
      "medicine",
      "business",
      "engineering",
      "law",
      "humanities"
    ],
    "language": [
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": true
      },
      {
        "id": "sat",
        "kind": "exam",
        "label": "SAT",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "sat_exam",
      "docs_translate",
      "apply_form"
    ],
    "official_url": "https://apply.ku.edu.tr/",
    "confidence": "verified",
    "notes": "Частный, есть медицина на английском и стипендии для международных студентов. Источник о сроках: «регулярный период объявляется отдельно; поздняя подача — август (без права на общежитие)»"
  },
  {
    "id": "hacettepe",
    "name": "Бакалавриат — медицина",
    "org": "Hacettepe University",
    "country": "TR",
    "city": "Ankara",
    "level": "bachelor",
    "fields": [
      "medicine",
      "natural_sciences",
      "engineering",
      "education"
    ],
    "language": [
      "tr",
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "tr",
        "kind": "language",
        "label": "Язык обучения: турецкий",
        "required": false
      },
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": false
      },
      {
        "id": "sat",
        "kind": "exam",
        "label": "SAT",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "sat_exam",
      "docs_translate",
      "apply_form"
    ],
    "official_url": "https://www.hacettepe.edu.tr/english/",
    "confidence": "verified",
    "notes": "Ведущий медицинский вуз Турции. Большинство программ на турецком, есть англоязычные. Источник о сроках: «Основной набор открывается в начале июня; бывает дополнительный набор в конце сентября – начале октября. Подача через портал bilsis.hacettepe.edu.tr, контакт int.stu@hacettepe.edu.tr»"
  },
  {
    "id": "utoronto",
    "name": "Бакалавриат — медицина",
    "org": "University of Toronto",
    "country": "CA",
    "city": "Toronto",
    "level": "bachelor",
    "fields": [
      "medicine",
      "engineering",
      "computer_science",
      "programming",
      "business",
      "humanities",
      "natural_sciences"
    ],
    "language": [
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": true
      },
      {
        "id": "ielts",
        "kind": "language",
        "label": "IELTS 6.5",
        "value": 6.5,
        "required": false
      },
      {
        "id": "sat",
        "kind": "exam",
        "label": "SAT",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "ielts_exam",
      "sat_exam",
      "docs_translate",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-02-01",
      "confidence": "derived",
      "source_id": "src:utoronto",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://future.utoronto.ca/apply/",
    "confidence": "verified",
    "notes": "Крупнейший исследовательский вуз Канады. Требования по IELTS и дедлайны различаются по факультетам. Источник о сроках: «Рекомендуемая ранняя подача — 7 ноября; стандартный дедлайн — 15 ЯНВАРЯ для большинства программ (Medical Radiation Sciences — 1 февраля). Документы — до 1 февраля (для ранних заявок до 1 декабря). Подавшие до 7 ноября и завершившие шаги до 2 декабря попадают в первый раунд рассмотрения. Решения — с января по конец мая»"
  },
  {
    "id": "ubc",
    "name": "Бакалавриат — инженерия",
    "org": "University of British Columbia",
    "country": "CA",
    "city": "Vancouver",
    "level": "bachelor",
    "fields": [
      "engineering",
      "computer_science",
      "programming",
      "natural_sciences",
      "business",
      "arts"
    ],
    "language": [
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": true
      },
      {
        "id": "ielts",
        "kind": "language",
        "label": "IELTS 6.5",
        "value": 6.5,
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "ielts_exam",
      "docs_translate",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-01-15",
      "confidence": "verified",
      "source_id": "src:ubc",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://you.ubc.ca/applying-ubc/",
    "confidence": "verified",
    "notes": "Личное эссе — обязательная часть анкеты, а не дополнение. Источник о сроках: «15 января 2027, 23:59 PST — подача на осенний набор. ВАЖНО: чтобы претендовать на стипендии International Scholars Program, подать нужно до 15 НОЯБРЯ 2026. Документы по английскому — до 31 января 2027; ELAS — до 15 февраля 2027; аттестат из-за пределов Канады — до 15 марта 2027»"
  },
  {
    "id": "mcgill",
    "name": "Бакалавриат — медицина",
    "org": "McGill University",
    "country": "CA",
    "city": "Montréal",
    "level": "bachelor",
    "fields": [
      "medicine",
      "law",
      "engineering",
      "humanities",
      "natural_sciences"
    ],
    "language": [
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": true
      },
      {
        "id": "ielts",
        "kind": "language",
        "label": "IELTS 6.5",
        "value": 6.5,
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "ielts_exam",
      "docs_translate",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-01-15",
      "confidence": "derived",
      "source_id": "src:mcgill",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://www.mcgill.ca/undergraduate-admissions/",
    "confidence": "verified",
    "notes": "Англоязычный вуз во франкоязычном Квебеке. Стоимость ниже, чем в Онтарио. Источник о сроках: «15 ЯНВАРЯ — дедлайн для абитуриентов, которые учились или учатся в зарубежной или американской школе, колледже либо вузе, на осенний набор. Охватывает: Agricultural & Environmental Sciences, Architecture, Arts (включая Social Work и Religious Studies), B.A.&Sc., Education, Engineering, Management, Nursing, Occupational Therapy, Physical Therapy, Science»"
  },
  {
    "id": "mcmaster",
    "name": "Бакалавриат — медицина",
    "org": "McMaster University",
    "country": "CA",
    "city": "Hamilton",
    "level": "bachelor",
    "fields": [
      "medicine",
      "natural_sciences",
      "engineering",
      "business"
    ],
    "language": [
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": true
      },
      {
        "id": "ielts",
        "kind": "language",
        "label": "IELTS 6.5",
        "value": 6.5,
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "ielts_exam",
      "docs_translate",
      "apply_form"
    ],
    "official_url": "https://future.mcmaster.ca/admission/",
    "confidence": "verified",
    "notes": "Health Sciences — одна из сильнейших программ Канады, очень высокий конкурс. Источник о сроках: «Подача через систему OUAC. Дедлайны РАЗНЫЕ ПО ПРОГРАММАМ, единой даты нет: большинство программ — 15 ЯНВАРЯ или 1 АПРЕЛЯ. Дополнительные заявки (supplementary applications) для конкурсных программ — с конца января по апрель. Honours Health Sciences — 1 апреля. BTech: 1 апреля на сентябрьский набор, для иностранцев январского набора НЕТ. Обработка решения занимает 4–6 недель после получения всех документов»"
  },
  {
    "id": "waterloo",
    "name": "Бакалавриат — IT и информатика",
    "org": "University of Waterloo",
    "country": "CA",
    "city": "Waterloo",
    "level": "bachelor",
    "fields": [
      "computer_science",
      "programming",
      "engineering",
      "mathematics"
    ],
    "language": [
      "en"
    ],
    "funding": [],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": true
      },
      {
        "id": "ielts",
        "kind": "language",
        "label": "IELTS 6.5",
        "value": 6.5,
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат с переводом",
        "required": true
      }
    ],
    "action_chain": [
      "ielts_exam",
      "docs_translate",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-02-01",
      "confidence": "verified",
      "source_id": "src:waterloo",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://uwaterloo.ca/future-students/admissions",
    "confidence": "verified",
    "notes": "Лучшая программа co-op в Канаде: оплачиваемые стажировки чередуются с учёбой. Источник о сроках: «Неинженерные программы — 1 февраля 2027 (документы до 15 февраля 2027). ИНЖЕНЕРИЯ (кроме архитектуры) — 15 января 2027 (документы до 1 февраля 2027), плюс ОБЯЗАТЕЛЬНОЕ онлайн-интервью для всех инженерных программ. Оптометрия — 12 ноября 2026. Фармация — 6 января 2027 (документы до 20 января). Для иностранцев дедлайны те же, что для канадцев»"
  },
  {
    "id": "nu",
    "name": "Бакалавриат — инженерия",
    "org": "Nazarbayev University",
    "country": "KZ",
    "city": "Астана",
    "level": "bachelor",
    "fields": [
      "engineering",
      "computer_science",
      "programming",
      "medicine",
      "business",
      "natural_sciences",
      "education"
    ],
    "language": [
      "en"
    ],
    "funding": [
      "state_grant",
      "partial"
    ],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": true
      },
      {
        "id": "ent",
        "kind": "exam",
        "label": "ЕНТ",
        "required": true
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат",
        "required": true
      }
    ],
    "action_chain": [
      "ent_exam",
      "kz_grant_apply",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-03-27",
      "confidence": "last_cycle",
      "source_id": "src:nu",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://apply.nu.edu.kz/en/admissions",
    "confidence": "verified",
    "notes": "ПОДТВЕРЖДЕНО: Foundation — IELTS 5.5 (5.5 Writing и Reading), GPA 3.5/5.0 или ЕНТ (матем. грамотность 7/10, грамотность чтения 7/10, общий 75). Бакалавриат — IELTS 6.0 (6.0 Writing; 5.5 Listening/Speaking/Reading), GPA 4.0/5.0 или ЕНТ (8/10, 8/10, общий 85). Стоимость 2025/26: Foundation 6 132 000 ₸, бакалавриат 7 665 000 ₸, сестринское дело 3 066 000 ₸. Источник о сроках: «ЕДИНАЯ ЗАЯВКА: одна подача — оценка сразу и на Foundation, и на бакалавриат. По циклу 2024/25 календарь был такой: подача открылась 16 октября, дедлайн для категории NUET — 7 декабря, для ИНОСТРАННЫХ абитуриентов — 29 февраля, для граждан Казахстана — 27 марта, результаты в МАЕ. Результаты специально дают в мае, чтобы непоступившие успели на конкурс государственных грантов. Категории SAT/ACT, IB Diploma и A-level/НИШ должны предоставить финальные результаты к мартовскому сроку. Взнос 10 000 тенге, в последние две недели перед закрытием — втрое больше»"
  },
  {
    "id": "kaznu",
    "name": "Бакалавриат — гуманитарные",
    "org": "Казахский национальный университет им. аль-Фараби",
    "country": "KZ",
    "city": "Алматы",
    "level": "bachelor",
    "fields": [
      "humanities",
      "natural_sciences",
      "law",
      "economics",
      "computer_science",
      "programming",
      "education"
    ],
    "language": [
      "kk",
      "ru",
      "en"
    ],
    "funding": [
      "state_grant",
      "partial"
    ],
    "requirements": [
      {
        "id": "kk",
        "kind": "language",
        "label": "Язык обучения: казахский",
        "required": false
      },
      {
        "id": "ru",
        "kind": "language",
        "label": "Язык обучения: русский",
        "required": false
      },
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": false
      },
      {
        "id": "ent",
        "kind": "exam",
        "label": "ЕНТ от 65 баллов",
        "value": 65,
        "required": true
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат",
        "required": true
      }
    ],
    "action_chain": [
      "ent_exam",
      "kz_grant_apply",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-07-20",
      "confidence": "derived",
      "source_id": "src:kaznu",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://www.kaznu.kz/ru/1/page/",
    "confidence": "verified",
    "notes": "Национальный вуз → пороговый балл ЕНТ 65. Самый широкий выбор направлений в стране. Источник о сроках: «Единый дедлайн для всех вузов РК — окно подачи на конкурс образовательных грантов: 13–20 июля. Результаты конкурса объявляются не позднее 10 августа (в 2026 объявлены 7 августа), зачисление в вузы завершается до 25 августа. ЕНТ: регистрация 11–25 апреля, тестирование 10 мая – 10 июля. КРИТИЧНО: на конкурс грантов засчитываются ТОЛЬКО майский и июльский результаты ЕНТ»"
  },
  {
    "id": "enu",
    "name": "Бакалавриат — гуманитарные",
    "org": "Евразийский национальный университет им. Л.Н. Гумилёва",
    "country": "KZ",
    "city": "Астана",
    "level": "bachelor",
    "fields": [
      "humanities",
      "natural_sciences",
      "law",
      "economics",
      "computer_science",
      "programming",
      "education"
    ],
    "language": [
      "kk",
      "ru",
      "en"
    ],
    "funding": [
      "state_grant",
      "partial"
    ],
    "requirements": [
      {
        "id": "kk",
        "kind": "language",
        "label": "Язык обучения: казахский",
        "required": false
      },
      {
        "id": "ru",
        "kind": "language",
        "label": "Язык обучения: русский",
        "required": false
      },
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": false
      },
      {
        "id": "ent",
        "kind": "exam",
        "label": "ЕНТ от 65 баллов",
        "value": 65,
        "required": true
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат",
        "required": true
      }
    ],
    "action_chain": [
      "ent_exam",
      "kz_grant_apply",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-07-20",
      "confidence": "derived",
      "source_id": "src:enu",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://www.enu.kz/ru/",
    "confidence": "verified",
    "notes": "Национальный вуз → пороговый балл ЕНТ 65. Источник о сроках: «Единый дедлайн для всех вузов РК — окно подачи на конкурс образовательных грантов: 13–20 июля. Результаты конкурса объявляются не позднее 10 августа (в 2026 объявлены 7 августа), зачисление в вузы завершается до 25 августа. ЕНТ: регистрация 11–25 апреля, тестирование 10 мая – 10 июля. КРИТИЧНО: на конкурс грантов засчитываются ТОЛЬКО майский и июльский результаты ЕНТ»"
  },
  {
    "id": "satbayev",
    "name": "Бакалавриат — инженерия",
    "org": "Satbayev University (КазНИТУ)",
    "country": "KZ",
    "city": "Алматы",
    "level": "bachelor",
    "fields": [
      "engineering",
      "natural_sciences",
      "computer_science",
      "programming"
    ],
    "language": [
      "kk",
      "ru",
      "en"
    ],
    "funding": [
      "state_grant",
      "partial"
    ],
    "requirements": [
      {
        "id": "kk",
        "kind": "language",
        "label": "Язык обучения: казахский",
        "required": false
      },
      {
        "id": "ru",
        "kind": "language",
        "label": "Язык обучения: русский",
        "required": false
      },
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": false
      },
      {
        "id": "ent",
        "kind": "exam",
        "label": "ЕНТ от 65 баллов",
        "value": 65,
        "required": true
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат",
        "required": true
      }
    ],
    "action_chain": [
      "ent_exam",
      "kz_grant_apply",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-07-20",
      "confidence": "derived",
      "source_id": "src:satbayev",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://satbayev.university/ru",
    "confidence": "verified",
    "notes": "Национальный вуз → порог 65. Горное дело, нефть и газ, геология, металлургия. Источник о сроках: «Единый дедлайн для всех вузов РК — окно подачи на конкурс образовательных грантов: 13–20 июля. Результаты конкурса объявляются не позднее 10 августа (в 2026 объявлены 7 августа), зачисление в вузы завершается до 25 августа. ЕНТ: регистрация 11–25 апреля, тестирование 10 мая – 10 июля. КРИТИЧНО: на конкурс грантов засчитываются ТОЛЬКО майский и июльский результаты ЕНТ»"
  },
  {
    "id": "kbtu",
    "name": "Бакалавриат — IT и информатика",
    "org": "Казахстанско-Британский технический университет (КБТУ)",
    "country": "KZ",
    "city": "Алматы",
    "level": "bachelor",
    "fields": [
      "computer_science",
      "programming",
      "engineering",
      "business",
      "economics"
    ],
    "language": [
      "en",
      "ru"
    ],
    "funding": [
      "state_grant",
      "partial"
    ],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": false
      },
      {
        "id": "ru",
        "kind": "language",
        "label": "Язык обучения: русский",
        "required": false
      },
      {
        "id": "ent",
        "kind": "exam",
        "label": "ЕНТ от 50 баллов",
        "value": 50,
        "required": true
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат",
        "required": true
      }
    ],
    "action_chain": [
      "ent_exam",
      "kz_grant_apply",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-07-20",
      "confidence": "derived",
      "source_id": "src:kbtu",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://kbtu.edu.kz/ru/",
    "confidence": "verified",
    "notes": "Пороговый балл 50 (не национальный вуз). IT, нефтегаз, бизнес. Обучение преимущественно на английском. Источник о сроках: «Единый дедлайн для всех вузов РК — окно подачи на конкурс образовательных грантов: 13–20 июля. Результаты конкурса объявляются не позднее 10 августа (в 2026 объявлены 7 августа), зачисление в вузы завершается до 25 августа. ЕНТ: регистрация 11–25 апреля, тестирование 10 мая – 10 июля. КРИТИЧНО: на конкурс грантов засчитываются ТОЛЬКО майский и июльский результаты ЕНТ»"
  },
  {
    "id": "aitu",
    "name": "Бакалавриат — IT и информатика",
    "org": "Astana IT University",
    "country": "KZ",
    "city": "Астана",
    "level": "bachelor",
    "fields": [
      "computer_science",
      "programming",
      "engineering"
    ],
    "language": [
      "en",
      "ru",
      "kk"
    ],
    "funding": [
      "state_grant",
      "partial"
    ],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": false
      },
      {
        "id": "ru",
        "kind": "language",
        "label": "Язык обучения: русский",
        "required": false
      },
      {
        "id": "kk",
        "kind": "language",
        "label": "Язык обучения: казахский",
        "required": false
      },
      {
        "id": "ent",
        "kind": "exam",
        "label": "ЕНТ от 50 баллов",
        "value": 50,
        "required": true
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат",
        "required": true
      }
    ],
    "action_chain": [
      "ent_exam",
      "kz_grant_apply",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-07-20",
      "confidence": "derived",
      "source_id": "src:aitu",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://astanait.edu.kz/",
    "confidence": "verified",
    "notes": "Профильный IT-вуз. Требует пару профильных предметов математика + физика или математика + информатика — уточнять по специальности. Источник о сроках: «Единый дедлайн для всех вузов РК — окно подачи на конкурс образовательных грантов: 13–20 июля. Результаты конкурса объявляются не позднее 10 августа (в 2026 объявлены 7 августа), зачисление в вузы завершается до 25 августа. ЕНТ: регистрация 11–25 апреля, тестирование 10 мая – 10 июля. КРИТИЧНО: на конкурс грантов засчитываются ТОЛЬКО майский и июльский результаты ЕНТ»"
  },
  {
    "id": "sdu",
    "name": "Бакалавриат — IT и информатика",
    "org": "Suleyman Demirel University (SDU)",
    "country": "KZ",
    "city": "Каскелен",
    "level": "bachelor",
    "fields": [
      "computer_science",
      "programming",
      "engineering",
      "education",
      "business",
      "law"
    ],
    "language": [
      "en",
      "kk",
      "ru"
    ],
    "funding": [
      "state_grant",
      "partial"
    ],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": false
      },
      {
        "id": "kk",
        "kind": "language",
        "label": "Язык обучения: казахский",
        "required": false
      },
      {
        "id": "ru",
        "kind": "language",
        "label": "Язык обучения: русский",
        "required": false
      },
      {
        "id": "ent",
        "kind": "exam",
        "label": "ЕНТ от 50 баллов",
        "value": 50,
        "required": true
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат",
        "required": true
      }
    ],
    "action_chain": [
      "ent_exam",
      "kz_grant_apply",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-07-20",
      "confidence": "derived",
      "source_id": "src:sdu",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://sdu.edu.kz/",
    "confidence": "verified",
    "notes": "IT, инженерия и педагогика. Обучение частично на английском. Источник о сроках: «Единый дедлайн для всех вузов РК — окно подачи на конкурс образовательных грантов: 13–20 июля. Результаты конкурса объявляются не позднее 10 августа (в 2026 объявлены 7 августа), зачисление в вузы завершается до 25 августа. ЕНТ: регистрация 11–25 апреля, тестирование 10 мая – 10 июля. КРИТИЧНО: на конкурс грантов засчитываются ТОЛЬКО майский и июльский результаты ЕНТ»"
  },
  {
    "id": "kimep",
    "name": "Бакалавриат — экономика",
    "org": "КИМЭП",
    "country": "KZ",
    "city": "Алматы",
    "level": "bachelor",
    "fields": [
      "economics",
      "business",
      "law",
      "humanities"
    ],
    "language": [
      "en"
    ],
    "funding": [
      "state_grant",
      "partial"
    ],
    "requirements": [
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": true
      },
      {
        "id": "ent",
        "kind": "exam",
        "label": "ЕНТ от 50 баллов",
        "value": 50,
        "required": true
      },
      {
        "id": "sat",
        "kind": "exam",
        "label": "SAT",
        "required": false
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат",
        "required": true
      }
    ],
    "action_chain": [
      "ent_exam",
      "kz_grant_apply",
      "sat_exam",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-07-20",
      "confidence": "derived",
      "source_id": "src:kimep",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://www.kimep.kz/ru/",
    "confidence": "verified",
    "notes": "Полностью англоязычный. Экономика, право, международные отношения. Принимает SAT. Источник о сроках: «Единый дедлайн для всех вузов РК — окно подачи на конкурс образовательных грантов: 13–20 июля. Результаты конкурса объявляются не позднее 10 августа (в 2026 объявлены 7 августа), зачисление в вузы завершается до 25 августа. ЕНТ: регистрация 11–25 апреля, тестирование 10 мая – 10 июля. КРИТИЧНО: на конкурс грантов засчитываются ТОЛЬКО майский и июльский результаты ЕНТ»"
  },
  {
    "id": "narxoz",
    "name": "Бакалавриат — экономика",
    "org": "Narxoz University",
    "country": "KZ",
    "city": "Алматы",
    "level": "bachelor",
    "fields": [
      "economics",
      "business",
      "law"
    ],
    "language": [
      "ru",
      "en",
      "kk"
    ],
    "funding": [
      "state_grant",
      "partial"
    ],
    "requirements": [
      {
        "id": "ru",
        "kind": "language",
        "label": "Язык обучения: русский",
        "required": false
      },
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": false
      },
      {
        "id": "kk",
        "kind": "language",
        "label": "Язык обучения: казахский",
        "required": false
      },
      {
        "id": "ent",
        "kind": "exam",
        "label": "ЕНТ от 50 баллов",
        "value": 50,
        "required": true
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат",
        "required": true
      }
    ],
    "action_chain": [
      "ent_exam",
      "kz_grant_apply",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-07-20",
      "confidence": "derived",
      "source_id": "src:narxoz",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://narxoz.edu.kz/",
    "confidence": "verified",
    "notes": "Экономика и финансы. Источник о сроках: «Единый дедлайн для всех вузов РК — окно подачи на конкурс образовательных грантов: 13–20 июля. Результаты конкурса объявляются не позднее 10 августа (в 2026 объявлены 7 августа), зачисление в вузы завершается до 25 августа. ЕНТ: регистрация 11–25 апреля, тестирование 10 мая – 10 июля. КРИТИЧНО: на конкурс грантов засчитываются ТОЛЬКО майский и июльский результаты ЕНТ»"
  },
  {
    "id": "almau",
    "name": "Бакалавриат — бизнес",
    "org": "Алматы Менеджмент Университет (AlmaU)",
    "country": "KZ",
    "city": "Алматы",
    "level": "bachelor",
    "fields": [
      "business",
      "economics",
      "law"
    ],
    "language": [
      "ru",
      "en"
    ],
    "funding": [
      "state_grant",
      "partial"
    ],
    "requirements": [
      {
        "id": "ru",
        "kind": "language",
        "label": "Язык обучения: русский",
        "required": false
      },
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": false
      },
      {
        "id": "ent",
        "kind": "exam",
        "label": "ЕНТ от 50 баллов",
        "value": 50,
        "required": true
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат",
        "required": true
      }
    ],
    "action_chain": [
      "ent_exam",
      "kz_grant_apply",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-07-20",
      "confidence": "derived",
      "source_id": "src:almau",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://almau.edu.kz/",
    "confidence": "verified",
    "notes": "Менеджмент и предпринимательство. Источник о сроках: «Единый дедлайн для всех вузов РК — окно подачи на конкурс образовательных грантов: 13–20 июля. Результаты конкурса объявляются не позднее 10 августа (в 2026 объявлены 7 августа), зачисление в вузы завершается до 25 августа. ЕНТ: регистрация 11–25 апреля, тестирование 10 мая – 10 июля. КРИТИЧНО: на конкурс грантов засчитываются ТОЛЬКО майский и июльский результаты ЕНТ»"
  },
  {
    "id": "kaznmu",
    "name": "Бакалавриат — медицина",
    "org": "Казахский национальный медицинский университет им. С.Д. Асфендиярова",
    "country": "KZ",
    "city": "Алматы",
    "level": "bachelor",
    "fields": [
      "medicine"
    ],
    "language": [
      "kk",
      "ru",
      "en"
    ],
    "funding": [
      "state_grant",
      "partial"
    ],
    "requirements": [
      {
        "id": "kk",
        "kind": "language",
        "label": "Язык обучения: казахский",
        "required": false
      },
      {
        "id": "ru",
        "kind": "language",
        "label": "Язык обучения: русский",
        "required": false
      },
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": false
      },
      {
        "id": "ent",
        "kind": "exam",
        "label": "ЕНТ от 70 баллов",
        "value": 70,
        "required": true
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат",
        "required": true
      }
    ],
    "action_chain": [
      "ent_exam",
      "kz_grant_apply",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-07-20",
      "confidence": "derived",
      "source_id": "src:kaznmu",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://kaznmu.edu.kz/",
    "confidence": "verified",
    "notes": "Пороговый балл ЕНТ для медицинских специальностей — 70. Профильные предметы: биология + химия. Источник о сроках: «Единый дедлайн для всех вузов РК — окно подачи на конкурс образовательных грантов: 13–20 июля. Результаты конкурса объявляются не позднее 10 августа (в 2026 объявлены 7 августа), зачисление в вузы завершается до 25 августа. ЕНТ: регистрация 11–25 апреля, тестирование 10 мая – 10 июля. КРИТИЧНО: на конкурс грантов засчитываются ТОЛЬКО майский и июльский результаты ЕНТ»"
  },
  {
    "id": "amu",
    "name": "Бакалавриат — медицина",
    "org": "Медицинский университет Астана",
    "country": "KZ",
    "city": "Астана",
    "level": "bachelor",
    "fields": [
      "medicine"
    ],
    "language": [
      "kk",
      "ru",
      "en"
    ],
    "funding": [
      "state_grant",
      "partial"
    ],
    "requirements": [
      {
        "id": "kk",
        "kind": "language",
        "label": "Язык обучения: казахский",
        "required": false
      },
      {
        "id": "ru",
        "kind": "language",
        "label": "Язык обучения: русский",
        "required": false
      },
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": false
      },
      {
        "id": "ent",
        "kind": "exam",
        "label": "ЕНТ от 70 баллов",
        "value": 70,
        "required": true
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат",
        "required": true
      }
    ],
    "action_chain": [
      "ent_exam",
      "kz_grant_apply",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-07-20",
      "confidence": "derived",
      "source_id": "src:amu",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://amu.edu.kz/",
    "confidence": "verified",
    "notes": "Порог для медицины — 70. Биология + химия. Источник о сроках: «Единый дедлайн для всех вузов РК — окно подачи на конкурс образовательных грантов: 13–20 июля. Результаты конкурса объявляются не позднее 10 августа (в 2026 объявлены 7 августа), зачисление в вузы завершается до 25 августа. ЕНТ: регистрация 11–25 апреля, тестирование 10 мая – 10 июля. КРИТИЧНО: на конкурс грантов засчитываются ТОЛЬКО майский и июльский результаты ЕНТ»"
  },
  {
    "id": "kmu",
    "name": "Бакалавриат — медицина",
    "org": "Медицинский университет Караганды",
    "country": "KZ",
    "city": "Караганда",
    "level": "bachelor",
    "fields": [
      "medicine"
    ],
    "language": [
      "kk",
      "ru",
      "en"
    ],
    "funding": [
      "state_grant",
      "partial"
    ],
    "requirements": [
      {
        "id": "kk",
        "kind": "language",
        "label": "Язык обучения: казахский",
        "required": false
      },
      {
        "id": "ru",
        "kind": "language",
        "label": "Язык обучения: русский",
        "required": false
      },
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": false
      },
      {
        "id": "ent",
        "kind": "exam",
        "label": "ЕНТ от 70 баллов",
        "value": 70,
        "required": true
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат",
        "required": true
      }
    ],
    "action_chain": [
      "ent_exam",
      "kz_grant_apply",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-07-20",
      "confidence": "derived",
      "source_id": "src:kmu",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://qmu.edu.kz/",
    "confidence": "verified",
    "notes": "Порог для медицины — 70. Один из крупнейших медвузов страны. Источник о сроках: «Единый дедлайн для всех вузов РК — окно подачи на конкурс образовательных грантов: 13–20 июля. Результаты конкурса объявляются не позднее 10 августа (в 2026 объявлены 7 августа), зачисление в вузы завершается до 25 августа. ЕНТ: регистрация 11–25 апреля, тестирование 10 мая – 10 июля. КРИТИЧНО: на конкурс грантов засчитываются ТОЛЬКО майский и июльский результаты ЕНТ»"
  },
  {
    "id": "wkmu",
    "name": "Бакалавриат — медицина",
    "org": "Западно-Казахстанский медицинский университет им. М. Оспанова",
    "country": "KZ",
    "city": "Актобе",
    "level": "bachelor",
    "fields": [
      "medicine"
    ],
    "language": [
      "kk",
      "ru"
    ],
    "funding": [
      "state_grant",
      "partial"
    ],
    "requirements": [
      {
        "id": "kk",
        "kind": "language",
        "label": "Язык обучения: казахский",
        "required": false
      },
      {
        "id": "ru",
        "kind": "language",
        "label": "Язык обучения: русский",
        "required": false
      },
      {
        "id": "ent",
        "kind": "exam",
        "label": "ЕНТ от 70 баллов",
        "value": 70,
        "required": true
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат",
        "required": true
      }
    ],
    "action_chain": [
      "ent_exam",
      "kz_grant_apply",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-07-20",
      "confidence": "derived",
      "source_id": "src:wkmu",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://zkmu.kz/",
    "confidence": "verified",
    "notes": "Порог для медицины — 70. Региональный медицинский вуз. Источник о сроках: «Единый дедлайн для всех вузов РК — окно подачи на конкурс образовательных грантов: 13–20 июля. Результаты конкурса объявляются не позднее 10 августа (в 2026 объявлены 7 августа), зачисление в вузы завершается до 25 августа. ЕНТ: регистрация 11–25 апреля, тестирование 10 мая – 10 июля. КРИТИЧНО: на конкурс грантов засчитываются ТОЛЬКО майский и июльский результаты ЕНТ»"
  },
  {
    "id": "abaiuniver",
    "name": "Бакалавриат — педагогика",
    "org": "Казахский национальный педагогический университет им. Абая",
    "country": "KZ",
    "city": "Алматы",
    "level": "bachelor",
    "fields": [
      "education",
      "humanities",
      "natural_sciences"
    ],
    "language": [
      "kk",
      "ru"
    ],
    "funding": [
      "state_grant",
      "partial"
    ],
    "requirements": [
      {
        "id": "kk",
        "kind": "language",
        "label": "Язык обучения: казахский",
        "required": false
      },
      {
        "id": "ru",
        "kind": "language",
        "label": "Язык обучения: русский",
        "required": false
      },
      {
        "id": "ent",
        "kind": "exam",
        "label": "ЕНТ от 75 баллов",
        "value": 75,
        "required": true
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат",
        "required": true
      }
    ],
    "action_chain": [
      "ent_exam",
      "kz_grant_apply",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-07-20",
      "confidence": "derived",
      "source_id": "src:abaiuniver",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://abaiuniver.edu.kz/",
    "confidence": "verified",
    "notes": "Пороговый балл для педагогических специальностей — 75, это выше медицины. Источник о сроках: «Единый дедлайн для всех вузов РК — окно подачи на конкурс образовательных грантов: 13–20 июля. Результаты конкурса объявляются не позднее 10 августа (в 2026 объявлены 7 августа), зачисление в вузы завершается до 25 августа. ЕНТ: регистрация 11–25 апреля, тестирование 10 мая – 10 июля. КРИТИЧНО: на конкурс грантов засчитываются ТОЛЬКО майский и июльский результаты ЕНТ»"
  },
  {
    "id": "ablaikhan",
    "name": "Бакалавриат — языки",
    "org": "КазУМОиМЯ им. Абылай хана",
    "country": "KZ",
    "city": "Алматы",
    "level": "bachelor",
    "fields": [
      "languages",
      "humanities",
      "education"
    ],
    "language": [
      "kk",
      "ru",
      "en"
    ],
    "funding": [
      "state_grant",
      "partial"
    ],
    "requirements": [
      {
        "id": "kk",
        "kind": "language",
        "label": "Язык обучения: казахский",
        "required": false
      },
      {
        "id": "ru",
        "kind": "language",
        "label": "Язык обучения: русский",
        "required": false
      },
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": false
      },
      {
        "id": "ent",
        "kind": "exam",
        "label": "ЕНТ от 75 баллов",
        "value": 75,
        "required": true
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат",
        "required": true
      }
    ],
    "action_chain": [
      "ent_exam",
      "kz_grant_apply",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-07-20",
      "confidence": "derived",
      "source_id": "src:ablaikhan",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://ablaikhan.kz/",
    "confidence": "verified",
    "notes": "Языки, переводоведение, международные отношения. Педагогические специальности — порог 75. Источник о сроках: «Единый дедлайн для всех вузов РК — окно подачи на конкурс образовательных грантов: 13–20 июля. Результаты конкурса объявляются не позднее 10 августа (в 2026 объявлены 7 августа), зачисление в вузы завершается до 25 августа. ЕНТ: регистрация 11–25 апреля, тестирование 10 мая – 10 июля. КРИТИЧНО: на конкурс грантов засчитываются ТОЛЬКО майский и июльский результаты ЕНТ»"
  },
  {
    "id": "aues",
    "name": "Бакалавриат — инженерия",
    "org": "Алматинский университет энергетики и связи им. Г. Даукеева",
    "country": "KZ",
    "city": "Алматы",
    "level": "bachelor",
    "fields": [
      "engineering",
      "computer_science",
      "programming"
    ],
    "language": [
      "kk",
      "ru",
      "en"
    ],
    "funding": [
      "state_grant",
      "partial"
    ],
    "requirements": [
      {
        "id": "kk",
        "kind": "language",
        "label": "Язык обучения: казахский",
        "required": false
      },
      {
        "id": "ru",
        "kind": "language",
        "label": "Язык обучения: русский",
        "required": false
      },
      {
        "id": "en",
        "kind": "language",
        "label": "Язык обучения: английский",
        "required": false
      },
      {
        "id": "ent",
        "kind": "exam",
        "label": "ЕНТ от 50 баллов",
        "value": 50,
        "required": true
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат",
        "required": true
      }
    ],
    "action_chain": [
      "ent_exam",
      "kz_grant_apply",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-07-20",
      "confidence": "derived",
      "source_id": "src:aues",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://aues.edu.kz/",
    "confidence": "verified",
    "notes": "Энергетика, телекоммуникации, автоматизация. Источник о сроках: «Единый дедлайн для всех вузов РК — окно подачи на конкурс образовательных грантов: 13–20 июля. Результаты конкурса объявляются не позднее 10 августа (в 2026 объявлены 7 августа), зачисление в вузы завершается до 25 августа. ЕНТ: регистрация 11–25 апреля, тестирование 10 мая – 10 июля. КРИТИЧНО: на конкурс грантов засчитываются ТОЛЬКО майский и июльский результаты ЕНТ»"
  },
  {
    "id": "auezov",
    "name": "Бакалавриат — инженерия",
    "org": "Южно-Казахстанский университет им. М. Ауэзова",
    "country": "KZ",
    "city": "Шымкент",
    "level": "bachelor",
    "fields": [
      "engineering",
      "education",
      "natural_sciences",
      "medicine",
      "agriculture"
    ],
    "language": [
      "kk",
      "ru"
    ],
    "funding": [
      "state_grant",
      "partial"
    ],
    "requirements": [
      {
        "id": "kk",
        "kind": "language",
        "label": "Язык обучения: казахский",
        "required": false
      },
      {
        "id": "ru",
        "kind": "language",
        "label": "Язык обучения: русский",
        "required": false
      },
      {
        "id": "ent",
        "kind": "exam",
        "label": "ЕНТ от 50 баллов",
        "value": 50,
        "required": true
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат",
        "required": true
      }
    ],
    "action_chain": [
      "ent_exam",
      "kz_grant_apply",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-07-20",
      "confidence": "derived",
      "source_id": "src:auezov",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://auezov.edu.kz/",
    "confidence": "verified",
    "notes": "Крупнейший вуз юга страны, широкий выбор направлений. Важен для абитуриентов из Шымкента и области. Источник о сроках: «Единый дедлайн для всех вузов РК — окно подачи на конкурс образовательных грантов: 13–20 июля. Результаты конкурса объявляются не позднее 10 августа (в 2026 объявлены 7 августа), зачисление в вузы завершается до 25 августа. ЕНТ: регистрация 11–25 апреля, тестирование 10 мая – 10 июля. КРИТИЧНО: на конкурс грантов засчитываются ТОЛЬКО майский и июльский результаты ЕНТ»"
  },
  {
    "id": "ktu",
    "name": "Бакалавриат — инженерия",
    "org": "Карагандинский технический университет им. А. Сагинова",
    "country": "KZ",
    "city": "Караганда",
    "level": "bachelor",
    "fields": [
      "engineering",
      "natural_sciences",
      "computer_science",
      "programming"
    ],
    "language": [
      "kk",
      "ru"
    ],
    "funding": [
      "state_grant",
      "partial"
    ],
    "requirements": [
      {
        "id": "kk",
        "kind": "language",
        "label": "Язык обучения: казахский",
        "required": false
      },
      {
        "id": "ru",
        "kind": "language",
        "label": "Язык обучения: русский",
        "required": false
      },
      {
        "id": "ent",
        "kind": "exam",
        "label": "ЕНТ от 50 баллов",
        "value": 50,
        "required": true
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат",
        "required": true
      }
    ],
    "action_chain": [
      "ent_exam",
      "kz_grant_apply",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-07-20",
      "confidence": "derived",
      "source_id": "src:ktu",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://www.ktu.edu.kz/",
    "confidence": "verified",
    "notes": "Горное дело, машиностроение, металлургия. Источник о сроках: «Единый дедлайн для всех вузов РК — окно подачи на конкурс образовательных грантов: 13–20 июля. Результаты конкурса объявляются не позднее 10 августа (в 2026 объявлены 7 августа), зачисление в вузы завершается до 25 августа. ЕНТ: регистрация 11–25 апреля, тестирование 10 мая – 10 июля. КРИТИЧНО: на конкурс грантов засчитываются ТОЛЬКО майский и июльский результаты ЕНТ»"
  },
  {
    "id": "kazatu",
    "name": "Бакалавриат — сельское хозяйство",
    "org": "Казахский агротехнический университет им. С. Сейфуллина",
    "country": "KZ",
    "city": "Астана",
    "level": "bachelor",
    "fields": [
      "agriculture",
      "veterinary",
      "engineering"
    ],
    "language": [
      "kk",
      "ru"
    ],
    "funding": [
      "state_grant",
      "partial"
    ],
    "requirements": [
      {
        "id": "kk",
        "kind": "language",
        "label": "Язык обучения: казахский",
        "required": false
      },
      {
        "id": "ru",
        "kind": "language",
        "label": "Язык обучения: русский",
        "required": false
      },
      {
        "id": "ent",
        "kind": "exam",
        "label": "ЕНТ от 50 баллов",
        "value": 50,
        "required": true
      },
      {
        "id": "attestat",
        "kind": "document",
        "label": "Аттестат",
        "required": true
      }
    ],
    "action_chain": [
      "ent_exam",
      "kz_grant_apply",
      "apply_form"
    ],
    "application_deadline": {
      "date": "2027-07-20",
      "confidence": "derived",
      "source_id": "src:kazatu",
      "checked_at": "2026-09-16"
    },
    "official_url": "https://kazatu.edu.kz/",
    "confidence": "verified",
    "notes": "Пороговый балл для сельского хозяйства и ветеринарии — 50, самый низкий из всех категорий. Источник о сроках: «Единый дедлайн для всех вузов РК — окно подачи на конкурс образовательных грантов: 13–20 июля. Результаты конкурса объявляются не позднее 10 августа (в 2026 объявлены 7 августа), зачисление в вузы завершается до 25 августа. ЕНТ: регистрация 11–25 апреля, тестирование 10 мая – 10 июля. КРИТИЧНО: на конкурс грантов засчитываются ТОЛЬКО майский и июльский результаты ЕНТ»"
  }
];
