// BNK SCHOOL OS lazy module: dashboard-events. Original function bodies preserved.
export function createDashboardEventsFeature(ctx){
const {TIMETABLE_DAY_LABEL,TIMETABLE_REENTRY_CACHE_MS,academicCalendarActivityModal,academicCalendarCurrent,academicCalendarDeleteItem,academicCalendarEditorModal,academicCalendarExport,academicCalendarLoadDraftModal,academicCalendarOverrideModal,academicCalendarSaveDraft,academicCalendarTogglePublish,academicCertificateFormModal,academicCertificateRoleSettingsModal,academicDocumentServiceFormModal,academicDocumentServiceSettingsModal,academicPlcPlanModal,academicRegistrationRoleSettingsModal,academicSubmissionApplyMonitoringFilter,academicSubmissionDeadlineModal,academicSubmissionOpenMonitoringTarget,academicSubmissionOpenSection,academicSupervisionManageWeekModal,academicSupervisionWeekModal,academicTransferFormModal,acknowledgePreschoolCover,applySchoolPeriodTemplateToAll,applyStudentPromotion,archiveTeachingAssignment,behaviorFeature,bindApprovalCenterEvents,bindDataCenterEvents,bindElectricityEvents,bindExamEvents,bindLearningSourceEvents,bindOfficialAttendanceEvents,bindPersonnelPaEvents,bindProcurementControlEvents,bindProcurementEvents,bindSchoolLunchEvents,bindSignatureSettingsEvents,bindStudentFollowupEvents,bnkRecordActionSignature,bnkSignatureBeforeAction,budgetControlSettingsModal,budgetRequestModal,budgetRequestPdfPreview,budgetSignerActionModal,budgetSignersModal,buttonLoading,canManageTimetableClassLocal,cancelSubstituteAllDay,candidateDetailText,classroomResearchDelete,classroomResearchFormModal,classroomResearchOpenOriginal,classroomResearchPreviewPdf,classroomResearchReportById,classroomResearchReviewModal,classroomResearchSubmitModal,classroomResearchVersionHistoryModal,clearSelectedTimetable,clubActivityAttendanceModal,clubActivityDelete,clubActivityFormModal,clubActivityMembersModal,clubActivityPhotosModal,clubActivityPreviewPdf,clubActivityReportById,clubActivityReviewModal,clubActivitySignModal,clubActivitySubmitModal,confirmSubstituteAllDay,copyStudentRegistryToSemester2,currentAcademicPeriod,deleteDraftLessonPlan,deleteLeaveDraft,deleteLessonFile,deletePreschoolUnit,deleteSelectedBudgetRequest,deleteSelectedHomeVisitRecord,deleteSelectedProject,deleteSelectedProjectActivity,deleteSelectedSubstituteRecord,deleteUserAccount,downloadApprovedPdf,dropTimetableItem,educationFeeFeature,escapeHtml,generateApprovedPdfFromDetail,homeVisitCreateModal,homeVisitFilteredRecords,homeVisitPdfPreview,homeVisitPeriodSettingsModal,homeVisitRecord,homeVisitSignatureModal,householdRowsHtml,hydrateHomeVisitPhotoPreviews,isPersonnelReviewer,isPlanBudgetHead,learnerActivityDelete,learnerActivityFormModal,learnerActivityPreviewPdf,learnerActivityReportById,learnerActivityResultsModal,learnerActivityReviewModal,learnerActivitySettingsModal,learnerActivitySignModal,learnerActivitySubmitModal,learningMediaDelete,learningMediaDirectorModal,learningMediaFormModal,learningMediaPreviewPdf,learningMediaReportById,learningMediaReviewModal,learningMediaSubmitModal,leaveA4Preview,leaveRequestModal,leaveReviewModal,lessonA4PreviewModal,lessonPlanModal,lessonUsageDelete,lessonUsageDirectorModal,lessonUsageDocumentSettingsModal,lessonUsageFormModal,lessonUsagePreviewPdf,lessonUsageReportById,lessonUsageReviewModal,lessonUsageSubmitModal,loadAcademicSubmissionWorkspace,loadActiveUserData,loadPublicData,money,officialAttendanceDateValue,officialAttendanceMonthValue,openCentralApprovalNotification,openJointActivityModal,openLeaveReportPreview,openPrivateFile,openStudentSeedImport,openSubstituteDayPlanner,openTimetablePeriodModal,personnelA4Preview,personnelPaCanReviewUi,personnelPaIsRequiredUi,personnelRecordModal,postLessonDelete,postLessonExecutiveSignModal,postLessonFormModal,postLessonPreviewPdf,postLessonReportById,postLessonReviewModal,postLessonSubmitModal,postLessonSystemCode,postLessonWorkflowSettingsModal,prepareBudgetRequest,preschoolCoverPdfPreview,preschoolRosterModal,preschoolUnitModal,previewSignature,projectActivityModal,projectModal,projectPdfPreview,renderAuth,renderDashboard,renderTimetableNavigation,reviewModal,revokeStudentCard,runUserDecision,saveHomeVisitStep,saveSubstituteAllDay,saveSubstituteDayAssignments,schoolClassLabel,schoolLunchCurrentFiscalYear,selectedBudgetRequest,selectedLeaveRequest,selectedProject,setMobileSidebar,setStudentCurrentAcademicTerm,setTimetablePeriodMode,showApprovalModal,showHomeVisitLocalPhotoPreview,showModuleLoadingScreen,showNotificationModal,showSchoolDocumentSignatureModal,signatureManagerModal,state,studentAcademicYearModal,studentApplyRoleScope,studentCardApplyRoleScope,studentCardBatchPrint,studentCardCertifierSettingsModal,studentCardIssueModal,studentCardPhotoModal,studentCardPreview,studentCardVisibleEnrollments,studentClassListPdf,studentClassListXlsx,studentDetailModal,studentExitEnrollmentModal,studentExportXlsx,studentImportModal,studentImportReconciliationModal,studentRegistryPdf,studentRoomModal,studentTemplateDownload,submitSelectedLeaveRequest,submitSelectedLessonPlan,substituteActiveDay,substituteAllDayPdfPreview,substituteAssignModal,substituteBatchDates,substitutePdfPreview,supabase,syncPreschoolCovers,syncSubstituteTeaching,teachingAssignmentModal,timetableBatchPdfPreview,timetableClassModal,timetableConstraintFeature,timetableCopySubjectsModal,timetableEditSubjectModal,timetableFilteredClasses,timetablePdfPreview,timetableSchoolPeriodTemplateModal,timetableStudentExportClassIds,timetableSubjectModal,timetableTeacherCapabilityModal,timetableTeacherName,toast,toggleTimetablePublish,unassignSelectedSubstitute,uploadHomeVisitPhoto,withWorkflowSignature}=ctx;
function bindDashboardEvents() {
  if(state.currentView === "data_center" && state.profile?.role === "super_admin") bindDataCenterEvents();
  // Bind primary navigation first so a module-specific binding error can never disable the sidebar.
  document.querySelectorAll("[data-view]").forEach(el => {
    if (el.dataset.view === "module:official_attendance") return;
    el.addEventListener("click", () => {
      const nextView = el.dataset.view;
      if (nextView === "module:academic_calendar" && state.currentView !== "module:academic_calendar") {
        state.academicCalendarAcademicYear=currentAcademicPeriod().academicYear;
        state.academicCalendarSemester=currentAcademicPeriod().semester;
        state.academicCalendarSection="hundred";
      }
      if (nextView === "module:academic_registration" && state.currentView !== "module:academic_registration") {
        state.academicRegistrationSection="home";
        state.academicRegistrationAcademicYear=currentAcademicPeriod().academicYear;
        state.academicRegistrationSemester=currentAcademicPeriod().semester;
        state.selectedAcademicTransferId=null;
        state.selectedAcademicCertificateId=null;
        state.selectedAcademicDocumentServiceId=null;
      }
      if (nextView === "module:academic_submissions" && state.currentView !== "module:academic_submissions") {
        state.academicSubmissionSection="home";
        state.academicSubmissionAcademicYear=currentAcademicPeriod().academicYear;
        state.academicSubmissionSemester=currentAcademicPeriod().semester;
        state.academicSubmissionTeacherFilter="";
        state.academicLessonPlanUsageTeacherFilter="";
        state.academicLessonPlanUsageView="mine";
      }
      if (nextView === "module:exam_management" && state.currentView !== "module:exam_management") {
        state.examAcademicYear=currentAcademicPeriod().academicYear;
        state.examSemester=currentAcademicPeriod().semester;
        state.examSection="sets";
        state.examEditorOpen=false;
        state.selectedExamSetId=null;
        state.examSearch="";
        state.examAttempts=[];
        state.examResponses=[];
        state.examAnalysisView="entry";
        state.examAnalysisLoadError="";
      }
      if (nextView === "module:learning_sources" && state.currentView !== "module:learning_sources") {
        state.learningSourceScopeFilter="all";
        state.learningSourceCategoryFilter="all";
        state.learningSourceStatusFilter="all";
        state.learningSourceSearch="";
        state.selectedLearningSourceId=null;
      }
      if (nextView === "module:student_followup" && state.currentView !== "module:student_followup") {
        state.studentFollowupAcademicYear=currentAcademicPeriod().academicYear;
        state.studentFollowupSemester=currentAcademicPeriod().semester;
        state.studentFollowupSearch="";
        state.selectedStudentFollowupBatchId=null;
      }
      if (nextView === "module:procurement_documents" && state.currentView !== "module:procurement_documents") {
        state.procurementAcademicYear=currentAcademicPeriod().academicYear;
        state.procurementSearch="";
        state.procurementStatusFilter="all";
        state.selectedProcurementCaseId=null;
      }
      if (nextView === "module:school_lunch_documents" && state.currentView !== "module:school_lunch_documents") {
        state.schoolLunchFiscalYear=schoolLunchCurrentFiscalYear();
        state.schoolLunchSearch="";
        state.schoolLunchStatusFilter="active";
        state.selectedSchoolLunchRoundId=null;
      }
      if (nextView === "module:lesson_plans" && state.currentView !== "module:lesson_plans") {
        state.lessonPlanMode = null;
        state.lessonTeacherView = "all";
        state.lessonTeacherId = null;
        state.selectedLessonPlanId = null;
        state.lessonDetail = null;
      }
      if (nextView === "module:personnel_records" && state.currentView !== "module:personnel_records") {
        state.personnelView=isPersonnelReviewer()?"admin":"own";
        state.selectedPersonnelUserId=null;
        state.selectedPersonnelPublicUserId=null;
      }
      if (nextView === "module:personnel_pa" && state.currentView !== "module:personnel_pa") {
        const reviewer=personnelPaCanReviewUi();
        const required=personnelPaIsRequiredUi();
        state.personnelPaPhase=reviewer&&!required?"tracking":"agreement";
        state.personnelPaView=reviewer&&!required?"dashboard":"mine";
        state.personnelPaSelectedPeriodId=null;
        state.personnelPaSelectedTeacherId=null;
      }
      if (nextView === "module:leave_management" && state.currentView !== "module:leave_management") {
        state.selectedLeaveRequestId = null;
        state.leaveView = "mine";
      }
      if (nextView === "module:official_attendance" && state.currentView !== "module:official_attendance") {
        state.officialAttendanceView="daily";
        state.officialAttendanceReportDate=officialAttendanceDateValue();
        state.officialAttendanceReportMonth=officialAttendanceMonthValue();
        state.officialAttendanceReportAcademicYear=currentAcademicPeriod().academicYear;
        state.officialAttendanceReportSemester=currentAcademicPeriod().semester;
      }
      if (nextView === "module:timetable_management" && state.currentView !== "module:timetable_management") {
        state.timetableSkipNextLoad=!!state.timetableClasses?.length
          && state.timetableLastLoadedUserId===state.user?.id
          && Date.now()-Number(state.timetableLastLoadedAt||0)<TIMETABLE_REENTRY_CACHE_MS;
        state.timetableSelectedClassId = null;
        state.timetableView = ["director","super_admin"].includes(state.profile.role) ? "overview" : "planner";
        state.timetableAcademicYear = currentAcademicPeriod().academicYear;
        state.timetableSemester = currentAcademicPeriod().semester;
      }
      if (nextView === "module:substitute_teaching" && state.currentView !== "module:substitute_teaching") {
        state.selectedSubstituteLessonId = null;
        state.selectedSubstituteLeaveId = null;
        state.selectedSubstituteDate = null;
        state.substituteCandidateMap = {};
        state.substituteAcademicYear = currentAcademicPeriod().academicYear;
        state.substituteSemester = currentAcademicPeriod().semester;
        state.substituteView = "manage";
      }
      if (nextView === "module:project_management" && state.currentView !== "module:project_management") {
        state.selectedProjectId=null; state.selectedProjectActivityId=null; state.selectedDisbursementId=null;
        state.projectAcademicYear=currentAcademicPeriod().academicYear;
        state.projectView=isPlanBudgetHead()?"overview":"mine"; state.projectDepartmentFilter="academic"; state.budgetRegistryDepartmentFilter="academic";
      }
      if (nextView === "module:home_visit_management" && state.currentView !== "module:home_visit_management") {
        state.selectedHomeVisitId=null; state.homeVisitStep=1; state.homeVisitAcademicYear=currentAcademicPeriod().academicYear; state.homeVisitSemester=currentAcademicPeriod().semester; state.homeVisitClassId=null; state.homeVisitScopeInitialized=false;
      }
      if (nextView === "module:student_registry" && state.currentView !== "module:student_registry") {
        state.studentRegistrySkipBaseOnce=!!state.studentRegistryStudents?.length && state.studentRegistryBaseLoadedUserId===state.user?.id && Date.now()-Number(state.studentRegistryLastLoadedAt||0)<25000;
        state.studentRegistryView="students"; state.studentRegistryAcademicYear=currentAcademicPeriod().academicYear; state.studentRegistrySemester=currentAcademicPeriod().semester;
        state.studentRegistryStageCode="all"; state.studentRegistryLevelName="all"; state.studentRegistryRoomName="all"; state.studentRegistrySearch=""; state.studentRegistryOwnClassId=null; state.studentRegistryScopeInitialized=false;
      }
      if (nextView === "module:student_cards" && state.currentView !== "module:student_cards") {
        state.studentCardAcademicYear=currentAcademicPeriod().academicYear; state.studentCardSemester=currentAcademicPeriod().semester;
        state.studentCardStageCode="all"; state.studentCardLevelName="all"; state.studentCardRoomName="all"; state.studentCardSearch=""; state.studentCardOwnClassId=null; state.studentCardScopeInitialized=false;
      }
      const isNewView=state.currentView!==nextView;
      state.currentView = nextView;
      setMobileSidebar(false);
      if(isNewView)showModuleLoadingScreen();
      renderDashboard();
    });
  });

  document.querySelector("#dashboard-toggle-systems")?.addEventListener("click",()=>{state.dashboardShowAllModules=!state.dashboardShowAllModules;renderDashboard();});
  document.querySelectorAll("[data-dashboard-pa-tracking]").forEach(b=>b.addEventListener("click",()=>{
    state.currentView="module:personnel_pa";
    state.personnelPaPhase="tracking";
    state.personnelPaView="dashboard";
    state.personnelPaSelectedTeacherId=null;
    state.personnelPaSelectedPeriodId=null;
    setMobileSidebar(false);
    renderDashboard();
  }));

  // Bind view-specific controls only after the sidebar/navigation is already usable.
  if (state.currentView === "module:official_attendance") bindOfficialAttendanceEvents();
  if (state.currentView === "module:learning_sources") bindLearningSourceEvents();
  if (state.currentView === "module:student_followup") bindStudentFollowupEvents();
  if (state.currentView === "module:exam_management") bindExamEvents();
  if (state.currentView === "module:personnel_pa") bindPersonnelPaEvents();
  if (state.currentView === "module:procurement_document_control") bindProcurementControlEvents();
  if (state.currentView === "module:procurement_documents") bindProcurementEvents();
  if (state.currentView === "module:student_behavior") behaviorFeature.bind();
  if (state.currentView === "module:education_fee_collection") educationFeeFeature.bind();
  if (state.currentView === "module:school_lunch_documents") bindSchoolLunchEvents();
  if (state.currentView === "module:housing_electricity") bindElectricityEvents();
  if (state.currentView === "approval_center") bindApprovalCenterEvents();
  if (state.currentView === "signature_settings") bindSignatureSettingsEvents();


  document.querySelector("#academic-registration-section")?.addEventListener("change",e=>{state.academicRegistrationSection=e.currentTarget.value;state.selectedAcademicTransferId=null;state.selectedAcademicCertificateId=null;state.selectedAcademicDocumentServiceId=null;renderDashboard();});
  document.querySelectorAll("[data-academic-registration-open]").forEach(b=>b.addEventListener("click",()=>{state.academicRegistrationSection=b.dataset.academicRegistrationOpen;state.selectedAcademicTransferId=null;state.selectedAcademicCertificateId=null;state.selectedAcademicDocumentServiceId=null;renderDashboard();}));
  document.querySelector("#academic-registration-year")?.addEventListener("change",e=>{state.academicRegistrationAcademicYear=Number(e.currentTarget.value);state.selectedAcademicTransferId=null;state.selectedAcademicCertificateId=null;state.selectedAcademicDocumentServiceId=null;renderDashboard();});
  document.querySelector("#academic-registration-semester")?.addEventListener("change",e=>{state.academicRegistrationSemester=Number(e.currentTarget.value);state.selectedAcademicTransferId=null;state.selectedAcademicCertificateId=null;state.selectedAcademicDocumentServiceId=null;renderDashboard();});
  document.querySelector("#academic-registration-role-settings")?.addEventListener("click",()=>academicRegistrationRoleSettingsModal());
  document.querySelector("#academic-certificate-role-settings")?.addEventListener("click",()=>academicCertificateRoleSettingsModal());
  document.querySelector("#academic-certificate-role-settings-inline")?.addEventListener("click",()=>academicCertificateRoleSettingsModal());
  document.querySelector("#academic-transfer-create")?.addEventListener("click",()=>academicTransferFormModal());
  document.querySelector("#academic-certificate-create")?.addEventListener("click",()=>academicCertificateFormModal());
  document.querySelector("#academic-document-service-create")?.addEventListener("click",()=>academicDocumentServiceFormModal());
  document.querySelector("#academic-document-service-settings")?.addEventListener("click",()=>academicDocumentServiceSettingsModal());
  document.querySelector("#academic-document-service-settings-hero")?.addEventListener("click",()=>academicDocumentServiceSettingsModal());

  document.querySelectorAll("[data-academic-submission-open]").forEach(b=>b.addEventListener("click",async e=>{e.preventDefault();await academicSubmissionOpenSection(b.dataset.academicSubmissionOpen,b);}));
  document.querySelectorAll("[data-academic-home-tab]").forEach(b=>b.addEventListener("click",()=>{state.academicSubmissionHomeTab=b.dataset.academicHomeTab==="monitoring"?"monitoring":"systems";renderDashboard();}));
  document.querySelector("#academic-monitor-search")?.addEventListener("input",academicSubmissionApplyMonitoringFilter);
  document.querySelector("#academic-monitor-only-incomplete")?.addEventListener("change",academicSubmissionApplyMonitoringFilter);
  document.querySelectorAll("[data-academic-monitor-system]").forEach(b=>b.addEventListener("click",async()=>{await academicSubmissionOpenMonitoringTarget(b.dataset.academicMonitorSystem,b.dataset.academicMonitorTeacher,b);}));
  academicSubmissionApplyMonitoringFilter();
  document.querySelector("#academic-submission-year")?.addEventListener("change",async e=>{state.academicSubmissionAcademicYear=Number(e.currentTarget.value);state.academicSubmissionTeacherFilter="";state.academicLessonPlanUsageTeacherFilter="";state.academicLearningMediaTeacherFilter="";state.academicClassroomResearchTeacherFilter="";state.academicLearnerActivityTeacherFilter="";state.academicClubActivityTeacherFilter="";await loadAcademicSubmissionWorkspace();await renderDashboard();});
  document.querySelector("#academic-submission-semester")?.addEventListener("change",async e=>{state.academicSubmissionSemester=Number(e.currentTarget.value);state.academicSubmissionTeacherFilter="";state.academicLessonPlanUsageTeacherFilter="";state.academicLearningMediaTeacherFilter="";state.academicClassroomResearchTeacherFilter="";state.academicLearnerActivityTeacherFilter="";state.academicClubActivityTeacherFilter="";await loadAcademicSubmissionWorkspace();await renderDashboard();});
  document.querySelector("#academic-submission-deadline-settings")?.addEventListener("click",e=>academicSubmissionDeadlineModal(e.currentTarget.dataset.deadlineSystem||postLessonSystemCode()));
  document.querySelector("#post-lesson-workflow-settings")?.addEventListener("click",()=>postLessonWorkflowSettingsModal());
  document.querySelector("#post-lesson-create")?.addEventListener("click",()=>postLessonFormModal());
  document.querySelector("#post-lesson-teacher-filter")?.addEventListener("change",e=>{state.academicSubmissionTeacherFilter=e.currentTarget.value;renderDashboard();});
  document.querySelectorAll("[data-post-lesson-view]").forEach(b=>b.addEventListener("click",()=>{state.academicSubmissionView=b.dataset.postLessonView;state.academicSubmissionTeacherFilter="";renderDashboard();}));
  document.querySelectorAll("[data-post-lesson-edit]").forEach(b=>b.addEventListener("click",()=>postLessonFormModal(postLessonReportById(b.dataset.postLessonEdit))));
  document.querySelectorAll("[data-post-lesson-submit]").forEach(b=>b.addEventListener("click",()=>postLessonSubmitModal(b.dataset.postLessonSubmit)));
  document.querySelectorAll("[data-post-lesson-review]").forEach(b=>b.addEventListener("click",()=>postLessonReviewModal(b.dataset.postLessonReview)));
  document.querySelectorAll("[data-post-lesson-exec-sign]").forEach(b=>b.addEventListener("click",()=>postLessonExecutiveSignModal(b.dataset.postLessonExecSign,b.dataset.postLessonExecSlot)));
  document.querySelectorAll("[data-post-lesson-delete]").forEach(b=>b.addEventListener("click",()=>postLessonDelete(b.dataset.postLessonDelete)));
  document.querySelectorAll("[data-post-lesson-preview]").forEach(b=>b.addEventListener("click",async()=>{buttonLoading(b,true,"กำลังสร้างตัวอย่าง...");await postLessonPreviewPdf(b.dataset.postLessonPreview);buttonLoading(b,false);}));
  document.querySelector("#lesson-usage-document-settings")?.addEventListener("click",()=>lessonUsageDocumentSettingsModal());
  document.querySelector("#lesson-usage-create")?.addEventListener("click",()=>lessonUsageFormModal());
  document.querySelector("#lesson-usage-teacher-filter")?.addEventListener("change",e=>{state.academicLessonPlanUsageTeacherFilter=e.currentTarget.value;renderDashboard();});
  document.querySelectorAll("[data-lesson-usage-view]").forEach(b=>b.addEventListener("click",()=>{state.academicLessonPlanUsageView=b.dataset.lessonUsageView;state.academicLessonPlanUsageTeacherFilter="";renderDashboard();}));
  document.querySelectorAll("[data-lesson-usage-edit]").forEach(b=>b.addEventListener("click",()=>lessonUsageFormModal(lessonUsageReportById(b.dataset.lessonUsageEdit))));
  document.querySelectorAll("[data-lesson-usage-submit]").forEach(b=>b.addEventListener("click",()=>lessonUsageSubmitModal(b.dataset.lessonUsageSubmit)));
  document.querySelectorAll("[data-lesson-usage-review]").forEach(b=>b.addEventListener("click",()=>lessonUsageReviewModal(b.dataset.lessonUsageReview,b.dataset.lessonUsageSlot)));
  document.querySelectorAll("[data-lesson-usage-director]").forEach(b=>b.addEventListener("click",()=>lessonUsageDirectorModal(b.dataset.lessonUsageDirector)));
  document.querySelectorAll("[data-lesson-usage-delete]").forEach(b=>b.addEventListener("click",()=>lessonUsageDelete(b.dataset.lessonUsageDelete)));
  document.querySelectorAll("[data-lesson-usage-preview]").forEach(b=>b.addEventListener("click",async()=>{buttonLoading(b,true,"กำลังสร้างตัวอย่าง...");await lessonUsagePreviewPdf(b.dataset.lessonUsagePreview);buttonLoading(b,false);}));
  document.querySelector("#learning-media-create")?.addEventListener("click",()=>learningMediaFormModal());
  document.querySelector("#learning-media-teacher-filter")?.addEventListener("change",e=>{state.academicLearningMediaTeacherFilter=e.currentTarget.value;renderDashboard();});
  document.querySelectorAll("[data-learning-media-view]").forEach(b=>b.addEventListener("click",()=>{state.academicLearningMediaView=b.dataset.learningMediaView;state.academicLearningMediaTeacherFilter="";renderDashboard();}));
  document.querySelectorAll("[data-learning-media-edit]").forEach(b=>b.addEventListener("click",()=>learningMediaFormModal(learningMediaReportById(b.dataset.learningMediaEdit))));
  document.querySelectorAll("[data-learning-media-submit]").forEach(b=>b.addEventListener("click",()=>learningMediaSubmitModal(b.dataset.learningMediaSubmit)));
  document.querySelectorAll("[data-learning-media-review]").forEach(b=>b.addEventListener("click",()=>learningMediaReviewModal(b.dataset.learningMediaReview,b.dataset.learningMediaSlot)));
  document.querySelectorAll("[data-learning-media-director]").forEach(b=>b.addEventListener("click",()=>learningMediaDirectorModal(b.dataset.learningMediaDirector)));
  document.querySelectorAll("[data-learning-media-delete]").forEach(b=>b.addEventListener("click",()=>learningMediaDelete(b.dataset.learningMediaDelete)));
  document.querySelectorAll("[data-learning-media-preview]").forEach(b=>b.addEventListener("click",async()=>{buttonLoading(b,true,"กำลังสร้างตัวอย่าง...");await learningMediaPreviewPdf(b.dataset.learningMediaPreview);buttonLoading(b,false);}));
  document.querySelector("#research-create")?.addEventListener("click",()=>classroomResearchFormModal());
  document.querySelector("#research-teacher-filter")?.addEventListener("change",e=>{state.academicClassroomResearchTeacherFilter=e.currentTarget.value;renderDashboard();});
  document.querySelectorAll("[data-research-view]").forEach(b=>b.addEventListener("click",()=>{state.academicClassroomResearchView=b.dataset.researchView;state.academicClassroomResearchTeacherFilter="";renderDashboard();}));
  document.querySelectorAll("[data-research-edit]").forEach(b=>b.addEventListener("click",()=>classroomResearchFormModal(classroomResearchReportById(b.dataset.researchEdit))));
  document.querySelectorAll("[data-research-submit]").forEach(b=>b.addEventListener("click",()=>classroomResearchSubmitModal(b.dataset.researchSubmit)));
  document.querySelectorAll("[data-research-review]").forEach(b=>b.addEventListener("click",()=>classroomResearchReviewModal(b.dataset.researchReview,b.dataset.researchSlot)));
  document.querySelectorAll("[data-research-delete]").forEach(b=>b.addEventListener("click",()=>classroomResearchDelete(b.dataset.researchDelete)));
  document.querySelectorAll("[data-research-original]").forEach(b=>b.addEventListener("click",()=>classroomResearchOpenOriginal(b.dataset.researchOriginal)));
  document.querySelectorAll("[data-research-history]").forEach(b=>b.addEventListener("click",()=>classroomResearchVersionHistoryModal(b.dataset.researchHistory)));
  document.querySelectorAll("[data-research-preview]").forEach(b=>b.addEventListener("click",async()=>{buttonLoading(b,true,"กำลังสร้างชุด PDF...");try{await classroomResearchPreviewPdf(b.dataset.researchPreview);}finally{buttonLoading(b,false);}}));
  document.querySelector("#la-create")?.addEventListener("click",()=>learnerActivityFormModal());
  document.querySelector("#la-workflow-settings")?.addEventListener("click",()=>learnerActivitySettingsModal());
  document.querySelector("#la-teacher-filter")?.addEventListener("change",e=>{state.academicLearnerActivityTeacherFilter=e.currentTarget.value;renderDashboard();});
  document.querySelectorAll("[data-la-view]").forEach(b=>b.addEventListener("click",()=>{state.academicLearnerActivityView=b.dataset.laView;state.academicLearnerActivityTeacherFilter="";renderDashboard();}));
  document.querySelectorAll("[data-la-edit]").forEach(b=>b.addEventListener("click",()=>learnerActivityFormModal(learnerActivityReportById(b.dataset.laEdit))));
  document.querySelectorAll("[data-la-results]").forEach(b=>b.addEventListener("click",()=>learnerActivityResultsModal(b.dataset.laResults)));
  document.querySelectorAll("[data-la-adviser-sign]").forEach(b=>b.addEventListener("click",()=>learnerActivitySignModal(b.dataset.laAdviserSign,b.dataset.laAdviserSlot)));
  document.querySelectorAll("[data-la-submit]").forEach(b=>b.addEventListener("click",()=>learnerActivitySubmitModal(b.dataset.laSubmit)));
  document.querySelectorAll("[data-la-review]").forEach(b=>b.addEventListener("click",()=>learnerActivityReviewModal(b.dataset.laReview,b.dataset.laSlot)));
  document.querySelectorAll("[data-la-delete]").forEach(b=>b.addEventListener("click",()=>learnerActivityDelete(b.dataset.laDelete)));
  document.querySelectorAll("[data-la-preview]").forEach(b=>b.addEventListener("click",async()=>{buttonLoading(b,true,"กำลังสร้าง PDF...");try{await learnerActivityPreviewPdf(b.dataset.laPreview);}finally{buttonLoading(b,false);}}));
  document.querySelector("#club-create")?.addEventListener("click",()=>clubActivityFormModal());
  document.querySelector("#club-teacher-filter")?.addEventListener("change",e=>{state.academicClubActivityTeacherFilter=e.currentTarget.value;renderDashboard();});
  document.querySelectorAll("[data-club-view]").forEach(b=>b.addEventListener("click",()=>{state.academicClubActivityView=b.dataset.clubView;state.academicClubActivityTeacherFilter="";renderDashboard();}));
  document.querySelectorAll("[data-club-edit]").forEach(b=>b.addEventListener("click",()=>clubActivityFormModal(clubActivityReportById(b.dataset.clubEdit))));
  document.querySelectorAll("[data-club-members]").forEach(b=>b.addEventListener("click",()=>clubActivityMembersModal(b.dataset.clubMembers)));
  document.querySelectorAll("[data-club-attendance]").forEach(b=>b.addEventListener("click",()=>clubActivityAttendanceModal(b.dataset.clubAttendance)));
  document.querySelectorAll("[data-club-photos]").forEach(b=>b.addEventListener("click",()=>clubActivityPhotosModal(b.dataset.clubPhotos)));
  document.querySelectorAll("[data-club-sign]").forEach(b=>b.addEventListener("click",()=>clubActivitySignModal(b.dataset.clubSign,b.dataset.clubSignSlot)));
  document.querySelectorAll("[data-club-submit]").forEach(b=>b.addEventListener("click",()=>clubActivitySubmitModal(b.dataset.clubSubmit)));
  document.querySelectorAll("[data-club-review]").forEach(b=>b.addEventListener("click",()=>clubActivityReviewModal(b.dataset.clubReview,b.dataset.clubReviewSlot)));
  document.querySelectorAll("[data-club-delete]").forEach(b=>b.addEventListener("click",()=>clubActivityDelete(b.dataset.clubDelete)));
  document.querySelectorAll("[data-club-preview]").forEach(b=>b.addEventListener("click",async()=>{buttonLoading(b,true,"กำลังสร้าง PDF...");try{await clubActivityPreviewPdf(b.dataset.clubPreview);}finally{buttonLoading(b,false);}}));

  document.querySelectorAll(".nav-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const group=btn.closest(".nav-group"),depId=btn.dataset.departmentToggle;
      if(!group||!depId)return;
      const opening=!group.classList.contains("open");
      group.classList.toggle("open",opening);
      btn.setAttribute("aria-expanded",opening?"true":"false");
      if(opening)state.sidebarExpandedDepartments.add(depId);else state.sidebarExpandedDepartments.delete(depId);
    });
  });

  document.querySelector("#mobile-menu")?.addEventListener("click", () => setMobileSidebar(!state.sidebarOpen));
  document.querySelector("#sidebar-scrim")?.addEventListener("click", () => setMobileSidebar(false));

  document.querySelector("#signout-btn")?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    state.currentView = "dashboard";
    state.sidebarExpandedDepartments = new Set();
    renderAuth("signin");
  });

  document.querySelectorAll("[data-personnel-view]").forEach(btn=>btn.addEventListener("click",()=>{state.personnelView=btn.dataset.personnelView;state.selectedPersonnelUserId=null;state.selectedPersonnelPublicUserId=null;renderDashboard();}));
  document.querySelectorAll("[data-personnel-user]").forEach(btn => btn.addEventListener("click", () => {
    state.personnelView="admin"; state.selectedPersonnelUserId = btn.dataset.personnelUser; renderDashboard();
  }));
  document.querySelector("#personnel-back")?.addEventListener("click", () => { state.selectedPersonnelUserId = null; renderDashboard(); });
  document.querySelectorAll("[data-personnel-public-user]").forEach(btn=>btn.addEventListener("click",()=>{state.personnelView="public";state.selectedPersonnelPublicUserId=btn.dataset.personnelPublicUser;renderDashboard();}));
  document.querySelector("#personnel-public-open")?.addEventListener("click",()=>{const id=document.querySelector("#personnel-public-select")?.value;if(!id)return toast("เลือกบุคลากรก่อน","กรุณาเลือกรายชื่อที่ต้องการดู","error");state.selectedPersonnelPublicUserId=id;renderDashboard();});
  document.querySelector("#personnel-public-back")?.addEventListener("click",()=>{state.selectedPersonnelPublicUserId=null;renderDashboard();});
  document.querySelector("#personnel-my-record")?.addEventListener("click", () => { state.personnelView="own"; state.selectedPersonnelUserId = null; renderDashboard(); });
  document.querySelector("#refresh-personnel")?.addEventListener("click", () => renderDashboard());
  document.querySelector("#edit-personnel-record")?.addEventListener("click", () => personnelRecordModal());
  document.querySelector("#personnel-a4")?.addEventListener("click", () => personnelA4Preview());
  document.querySelectorAll("[data-notification-personnel]").forEach(el => el.addEventListener("click", async () => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("recipient_id",state.user.id).eq("type","personnel_profile_required").is("read_at",null);
    state.currentView = "module:personnel_records";
    state.selectedPersonnelUserId = state.user.id;
    await loadActiveUserData();
    renderDashboard();
  }));

  document.querySelectorAll("[data-leave-view]").forEach(btn=>btn.addEventListener("click",()=>{
    state.leaveView=btn.dataset.leaveView;
    state.selectedLeaveRequestId=null;
    renderDashboard();
  }));
  document.querySelectorAll("[data-leave-view-direct]").forEach(btn=>btn.addEventListener("click",()=>{
    state.leaveView=btn.dataset.leaveViewDirect;
    state.selectedLeaveRequestId=null;
    renderDashboard();
  }));
  document.querySelector("#leave-report-year")?.addEventListener("change",e=>{
    state.leaveReportAcademicYear=Number(e.currentTarget.value);
    renderDashboard();
  });
  document.querySelector("#leave-report-semester")?.addEventListener("change",e=>{
    state.leaveReportSemester=e.currentTarget.value;
    renderDashboard();
  });
  document.querySelector("#leave-report-person")?.addEventListener("change",e=>{
    state.leaveReportPersonId=e.currentTarget.value;
    renderDashboard();
  });
  document.querySelectorAll("[data-leave-person]").forEach(btn=>btn.addEventListener("click",()=>{
    state.leaveReportPersonId=btn.dataset.leavePerson;
    document.querySelector("#leave-report-person")?.scrollIntoView({behavior:"smooth",block:"center"});
    renderDashboard();
  }));
  document.querySelector("#export-school-leave-report")?.addEventListener("click",()=>openLeaveReportPreview("school"));
  document.querySelector("#export-person-leave-report")?.addEventListener("click",()=>openLeaveReportPreview("person"));
  document.querySelector("#new-leave-request")?.addEventListener("click",()=>leaveRequestModal());
  document.querySelector("#refresh-leave")?.addEventListener("click",()=>renderDashboard());
  document.querySelectorAll(".leave-open").forEach(btn=>btn.addEventListener("click",()=>{
    state.selectedLeaveRequestId=btn.dataset.leaveId;
    renderDashboard();
  }));
  document.querySelector("#leave-detail-back")?.addEventListener("click",()=>{
    state.selectedLeaveRequestId=null;
    renderDashboard();
  });
  document.querySelector("#edit-leave-request")?.addEventListener("click",()=>{
    const r=selectedLeaveRequest();
    if(r) leaveRequestModal(r);
  });
  document.querySelector("#submit-leave-request")?.addEventListener("click",()=>submitSelectedLeaveRequest());
  document.querySelector("#delete-leave-draft")?.addEventListener("click",()=>deleteLeaveDraft());
  document.querySelectorAll("[data-leave-review]").forEach(btn=>btn.addEventListener("click",()=>leaveReviewModal(btn.dataset.leaveReview)));
  document.querySelector("#leave-a4")?.addEventListener("click",()=>leaveA4Preview());
  document.querySelector("#leave-sign-now")?.addEventListener("click",()=>{const r=selectedLeaveRequest();if(r)showSchoolDocumentSignatureModal({client:supabase,kind:"leave",docId:r.id,userId:state.user.id,notify:toast,onSaved:async()=>{await renderDashboard();}});});
  document.querySelectorAll("[data-notification-signature]").forEach(el => el.addEventListener("click", async () => {
    await supabase.from("notifications").update({read_at:new Date().toISOString()}).eq("recipient_id",state.user.id).eq("type","signature_profile_required");
    state.currentView="signature_settings"; await renderDashboard();
  }));
  document.querySelectorAll("[data-notification-leave]").forEach(el=>el.addEventListener("click",async()=>{
    const id=el.dataset.notificationLeave;
    await supabase.from("notifications").update({read_at:new Date().toISOString()}).eq("entity_id",id).eq("recipient_id",state.user.id);
    state.currentView="module:leave_management";
    state.selectedLeaveRequestId=id;
    await loadActiveUserData();
    await renderDashboard();
  }));

  document.querySelectorAll("[data-preschool-cover-open]").forEach(btn=>btn.addEventListener("click",()=>{
    state.selectedPreschoolCoverId=btn.dataset.preschoolCoverOpen;renderDashboard();
  }));
  document.querySelector("#preschool-cover-back")?.addEventListener("click",()=>{state.selectedPreschoolCoverId=null;renderDashboard();});
  document.querySelector("#preschool-cover-export")?.addEventListener("click",()=>preschoolCoverPdfPreview(state.selectedPreschoolCoverId));
  document.querySelectorAll("[data-preschool-ack]").forEach(btn=>btn.addEventListener("click",()=>acknowledgePreschoolCover(btn.dataset.preschoolAck,btn.dataset.ackValue==="true",btn)));
  document.querySelector("#sync-preschool-covers")?.addEventListener("click",()=>syncPreschoolCovers());
  document.querySelectorAll("[data-substitute-view]").forEach(btn=>btn.addEventListener("click",()=>{
    state.substituteView=btn.dataset.substituteView;
    state.selectedSubstituteLessonId=null;
    state.selectedSubstituteLeaveId=null;
    state.selectedSubstituteDate=null;
    state.substituteCandidateMap={};
    state.selectedPreschoolCoverId=null;
    renderDashboard();
  }));
  document.querySelector("#substitute-year")?.addEventListener("change",e=>{
    state.substituteAcademicYear=Number(e.currentTarget.value);
    state.selectedSubstituteLessonId=null; state.selectedSubstituteLeaveId=null; state.selectedSubstituteDate=null; state.selectedPreschoolCoverId=null; state.substituteCandidateMap={}; renderDashboard();
  });
  document.querySelector("#substitute-semester")?.addEventListener("change",e=>{
    state.substituteSemester=Number(e.currentTarget.value);
    state.selectedSubstituteLessonId=null; state.selectedSubstituteLeaveId=null; state.selectedSubstituteDate=null; state.selectedPreschoolCoverId=null; state.substituteCandidateMap={}; renderDashboard();
  });
  document.querySelector("#refresh-substitute")?.addEventListener("click",()=>renderDashboard());
  document.querySelector("#sync-substitute-lessons")?.addEventListener("click",()=>syncSubstituteTeaching());
  document.querySelectorAll("[data-substitute-open]").forEach(btn=>btn.addEventListener("click",()=>{
    state.selectedSubstituteLessonId=btn.dataset.substituteOpen; state.selectedSubstituteLeaveId=null; state.selectedSubstituteDate=null; renderDashboard();
  }));
  document.querySelectorAll("[data-substitute-sign]").forEach(btn=>btn.addEventListener("click",async()=>{
    const row=state.substituteLessons.find(x=>x.id===btn.dataset.substituteSign);
    if(!row||row.status!=="assigned"||row.substitute_teacher_id!==state.user.id)return;
    await withWorkflowSignature({
      client:supabase,userId:state.user.id,
      title:"เลือกลายเซ็นก่อนยืนยันรับสอนแทน คาบ "+row.period_no,notify:toast,
      onConfirm:async({method,signatureId})=>{
        const {error}=await supabase.rpc("confirm_substitute_teacher_signed",{
          p_substitute_lesson_id:row.id,p_method:method,p_signature:signatureId
        });
        if(error)throw error;
        toast("ยืนยันรับงานสอนแทนพร้อมลายเซ็นแล้ว","ลายเซ็นจะปรากฏในเอกสารสอนแทน","success");
        await renderDashboard();
      }
    });
  }));
  document.querySelector("#sign-substitute-day")?.addEventListener("click",()=>{if(state.selectedSubstituteLeaveId&&state.selectedSubstituteDate)showSchoolDocumentSignatureModal({client:supabase,kind:"substitute",docId:state.selectedSubstituteLeaveId,date:state.selectedSubstituteDate,userId:state.user.id,notify:toast,onSaved:async()=>{await renderDashboard();}});});
  document.querySelectorAll("[data-substitute-assign]").forEach(btn=>btn.addEventListener("click",()=>substituteAssignModal(btn.dataset.substituteAssign)));
  document.querySelectorAll("[data-open-substitute-day]").forEach(btn=>btn.addEventListener("click",async()=>{
    const leaveId=btn.dataset.openSubstituteDay,select=document.querySelector(`[data-substitute-date-select="${leaveId}"]`);
    await openSubstituteDayPlanner(leaveId,select?.value||null);
  }));
  document.querySelector("#substitute-day-date")?.addEventListener("change",async e=>await openSubstituteDayPlanner(state.selectedSubstituteLeaveId,e.currentTarget.value));
  document.querySelectorAll("[data-substitute-mode]").forEach(b=>b.addEventListener("click",()=>{
    state.substituteDayMode=b.dataset.substituteMode;renderDashboard();
  }));
  document.querySelector("#save-substitute-all-day")?.addEventListener("click",saveSubstituteAllDay);
  document.querySelector("#cancel-substitute-all-day")?.addEventListener("click",cancelSubstituteAllDay);
  document.querySelector("#substitute-all-day-pdf")?.addEventListener("click",()=>{
    const day=substituteActiveDay(state.selectedSubstituteLeaveId,state.selectedSubstituteDate);
    if(day)substituteAllDayPdfPreview(day.id);
  });
  document.querySelectorAll("[data-confirm-substitute-all-day]").forEach(b=>b.addEventListener("click",()=>confirmSubstituteAllDay(b.dataset.confirmSubstituteAllDay)));
  document.querySelectorAll("[data-substitute-all-day-pdf]").forEach(b=>b.addEventListener("click",()=>substituteAllDayPdfPreview(b.dataset.substituteAllDayPdf)));
  document.querySelector("#substitute-day-back")?.addEventListener("click",()=>{
    state.selectedSubstituteLeaveId=null; state.selectedSubstituteDate=null; state.substituteCandidateMap={}; renderDashboard();
  });
  document.querySelector("#save-substitute-day")?.addEventListener("click",()=>saveSubstituteDayAssignments());
  document.querySelector("#export-substitute-day")?.addEventListener("click",()=>substitutePdfPreview(state.selectedSubstituteLeaveId,state.selectedSubstituteDate));
  document.querySelectorAll("[data-substitute-choice]").forEach(select=>select.addEventListener("change",()=>{
    const lessonId=select.dataset.substituteChoice,candidate=(state.substituteCandidateMap[lessonId]||[]).find(c=>c.teacher_id===select.value),detail=document.querySelector(`[data-candidate-detail="${lessonId}"]`);
    if(detail)detail.textContent=candidateDetailText(candidate);
  }));
  document.querySelector("#substitute-back")?.addEventListener("click",()=>{state.selectedSubstituteLessonId=null;renderDashboard();});
  document.querySelector("#unassign-substitute")?.addEventListener("click",()=>unassignSelectedSubstitute());
  document.querySelector("#delete-substitute-record")?.addEventListener("click",()=>deleteSelectedSubstituteRecord());
  document.querySelectorAll("[data-open-leave-substitute]").forEach(btn=>btn.addEventListener("click",async()=>{
    const leaveId=btn.dataset.openLeaveSubstitute;
    state.currentView="module:substitute_teaching"; state.substituteView="absent"; state.targetPreschoolLeaveId=leaveId; state.selectedSubstituteLeaveId=leaveId; state.selectedSubstituteLessonId=null; state.selectedSubstituteDate=null; state.substituteCandidateMap={};
    await renderDashboard();
    const dates=substituteBatchDates(leaveId);
    if(dates.length)await openSubstituteDayPlanner(leaveId,dates[0]);
  }));
  document.querySelectorAll("[data-notification-substitute]").forEach(el=>el.addEventListener("click",async()=>{
    const entityId=el.dataset.notificationSubstitute,entityType=el.dataset.substituteEntity;
    await supabase.from("notifications").update({read_at:new Date().toISOString()}).eq("recipient_id",state.user.id).eq("entity_type",entityType).eq("entity_id",entityId);
    state.currentView="module:substitute_teaching";
    state.selectedSubstituteLessonId=entityType==="substitute_lesson"?entityId:null;
    state.selectedSubstituteLeaveId=entityType==="substitute_batch"?entityId:null;
    state.selectedSubstituteDate=null; state.substituteCandidateMap={};
    await loadActiveUserData(); await renderDashboard();
    if(entityType==="substitute_batch"&&state.selectedSubstituteLeaveId){const dates=substituteBatchDates(state.selectedSubstituteLeaveId); if(dates.length)await openSubstituteDayPlanner(state.selectedSubstituteLeaveId,dates[0]);}
  }));

  document.querySelector("#notification-btn")?.addEventListener("click", () => showNotificationModal());

  document.querySelectorAll("[data-academic-calendar-section]").forEach(btn=>btn.addEventListener("click",()=>{state.academicCalendarSection=btn.dataset.academicCalendarSection;renderDashboard();}));
  document.querySelector("#academic-calendar-year")?.addEventListener("change",e=>{state.academicCalendarAcademicYear=Number(e.currentTarget.value);renderDashboard();});
  document.querySelector("#academic-calendar-semester")?.addEventListener("change",e=>{state.academicCalendarSemester=Number(e.currentTarget.value);renderDashboard();});
  document.querySelector("#supervision-add-week")?.addEventListener("click",()=>academicSupervisionWeekModal());
  document.querySelectorAll("[data-supervision-manage-week]").forEach(b=>b.addEventListener("click",()=>academicSupervisionManageWeekModal(b.dataset.supervisionManageWeek)));
  document.querySelectorAll("[data-supervision-delete-week]").forEach(b=>b.addEventListener("click",async()=>{if(!confirm("ลบสัปดาห์นิเทศนี้และคาบที่ล็อกไว้ทั้งหมดใช่หรือไม่?"))return;const {error}=await supabase.from("academic_supervision_weeks").delete().eq("id",b.dataset.supervisionDeleteWeek);if(error)return toast("ลบสัปดาห์ไม่สำเร็จ",error.message,"error");await renderDashboard();}));
  document.querySelector("#plc-add-plan")?.addEventListener("click",()=>academicPlcPlanModal());
  document.querySelectorAll("[data-plc-edit]").forEach(b=>b.addEventListener("click",()=>academicPlcPlanModal((state.academicPlcPlans||[]).find(x=>x.id===b.dataset.plcEdit)||null)));
  document.querySelectorAll("[data-plc-delete]").forEach(b=>b.addEventListener("click",async()=>{if(!confirm("ลบกำหนดการ PLC นี้ทั้งหมดใช่หรือไม่?"))return;const {error}=await supabase.from("academic_plc_plans").delete().eq("id",b.dataset.plcDelete);if(error)return toast("ลบ PLC ไม่สำเร็จ",error.message,"error");await renderDashboard();}));
  document.querySelector("#academic-calendar-load-draft")?.addEventListener("click",()=>academicCalendarLoadDraftModal());
  document.querySelector("#academic-calendar-create")?.addEventListener("click",()=>academicCalendarEditorModal());
  document.querySelector("#academic-calendar-edit")?.addEventListener("click",()=>academicCalendarEditorModal(academicCalendarCurrent()));
  document.querySelector("#academic-calendar-add-holiday")?.addEventListener("click",()=>academicCalendarOverrideModal("holiday"));
  document.querySelector("#academic-calendar-add-special")?.addEventListener("click",()=>academicCalendarOverrideModal("special_school_day"));
  document.querySelector("#academic-calendar-add-activity")?.addEventListener("click",()=>academicCalendarActivityModal());
  document.querySelector("#academic-calendar-save-draft")?.addEventListener("click",()=>academicCalendarSaveDraft());
  document.querySelector("#academic-calendar-publish")?.addEventListener("click",()=>academicCalendarTogglePublish());
  document.querySelector("#academic-calendar-export-image")?.addEventListener("click",()=>academicCalendarExport("image"));
  document.querySelector("#academic-calendar-export-pdf")?.addEventListener("click",()=>academicCalendarExport("pdf"));
  document.querySelectorAll("[data-academic-calendar-edit-item]").forEach(btn=>btn.addEventListener("click",()=>{const type=btn.dataset.academicCalendarItemType,id=btn.dataset.academicCalendarEditItem;if(type==="activity"){const item=state.academicCalendarActivities.find(x=>x.id===id);if(item)academicCalendarActivityModal(item);}else{const item=state.academicCalendarOverrides.find(x=>x.id===id);if(item)academicCalendarOverrideModal(item.override_type,item);}}));
  document.querySelectorAll("[data-academic-calendar-delete-item]").forEach(btn=>btn.addEventListener("click",()=>academicCalendarDeleteItem(btn.dataset.academicCalendarDeleteItem,btn.dataset.academicCalendarItemType)));

  document.querySelector("#system-settings-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.currentTarget.querySelector('button[type="submit"]');
    buttonLoading(btn, true, "กำลังบันทึก...");
    const selectedAcademicYear = String(document.querySelector("#setting-current-academic-year")?.value || currentAcademicPeriod().academicYear).trim();
    const selectedSemester = Number(document.querySelector("#setting-current-semester")?.value || currentAcademicPeriod().semester);
    const payload = {
      system_name: document.querySelector("#setting-system-name").value.trim(),
      brand_short: document.querySelector("#setting-brand-short").value.trim(),
      school_name_th: document.querySelector("#setting-school-name").value.trim(),
      school_address_th: document.querySelector("#setting-school-address").value.trim(),
      education_office_th: document.querySelector("#setting-education-office").value.trim(),
      special_area_school: document.querySelector("#setting-special-area").checked,
      assistant_teacher_years: Number(document.querySelector("#setting-assistant-years").value || 2),
      qualification_standard_years: Number(document.querySelector("#setting-standard-years").value || 4),
      qualification_special_years: Number(document.querySelector("#setting-special-years").value || 3),
      leave_quota_term1_times: Number(document.querySelector("#setting-leave-term1-times").value || 0),
      leave_quota_term1_days: Number(document.querySelector("#setting-leave-term1-days").value || 0),
      leave_quota_term2_times: Number(document.querySelector("#setting-leave-term2-times").value || 0),
      leave_quota_term2_days: Number(document.querySelector("#setting-leave-term2-days").value || 0),
      updated_by: state.user.id,
    };
    const { error } = await supabase.from("system_settings").update(payload).eq("id", 1);
    buttonLoading(btn, false);
    if (error) return toast("บันทึกการตั้งค่าไม่สำเร็จ", error.message, "error");
    const termUpsert = await supabase.from("academic_terms").upsert({academic_year:selectedAcademicYear,semester:selectedSemester,is_current:false},{onConflict:"academic_year,semester"});
    if(termUpsert.error)return toast("ตั้งปีการศึกษาปัจจุบันไม่สำเร็จ",termUpsert.error.message,"error");
    const termSet = await supabase.rpc("set_current_academic_term",{p_academic_year:selectedAcademicYear,p_semester:selectedSemester});
    if(termSet.error)return toast("ตั้งปีการศึกษาปัจจุบันไม่สำเร็จ",termSet.error.message,"error");
    const calendarEditorId = document.querySelector("#setting-academic-calendar-editor")?.value || null;
    const calendarSettingUpdate = await supabase.from("academic_calendar_settings").update({editor_user_id:calendarEditorId,updated_at:new Date().toISOString(),updated_by:state.user.id}).eq("id",1);
    if(calendarSettingUpdate.error)return toast("ตั้งผู้รับผิดชอบปฏิทินไม่สำเร็จ",calendarSettingUpdate.error.message,"error");
    const supervisionSettingUpdate = await supabase.from("academic_supervision_settings").update({
      deputy_academic_user_id: document.querySelector("#setting-supervision-deputy")?.value || null,
      coordinator_user_id: document.querySelector("#setting-supervision-coordinator")?.value || null,
      updated_at:new Date().toISOString(),updated_by:state.user.id
    }).eq("id",1);
    if(supervisionSettingUpdate.error)return toast("ตั้งสิทธิ์ปฏิทินนิเทศไม่สำเร็จ",supervisionSettingUpdate.error.message,"error");
    const registrationSettingUpdate = await supabase.from("academic_registration_settings").update({
      registrar_user_id: document.querySelector("#setting-registration-registrar")?.value || null,
      finance_user_id: document.querySelector("#setting-registration-finance")?.value || null,
      assessment_user_id: document.querySelector("#setting-registration-assessment")?.value || null,
      director_user_id: document.querySelector("#setting-registration-director")?.value || null,
      updated_at:new Date().toISOString(),updated_by:state.user.id
    }).eq("id",1);
    if(registrationSettingUpdate.error)return toast("ตั้งผู้รับผิดชอบงานทะเบียนไม่สำเร็จ",registrationSettingUpdate.error.message,"error");
    await loadPublicData();
    await loadActiveUserData();
    toast("บันทึกการตั้งค่าแล้ว", `ระบบกำหนดปีการศึกษา ${selectedAcademicYear} ภาคเรียนที่ ${selectedSemester} เป็นค่าปัจจุบันแล้ว`, "success");
    renderDashboard();
  });

  document.querySelectorAll("[data-user-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const user = state.pendingUsers.find(u => u.id === btn.dataset.userId);
      if (!user) return;
      if (["approve","reactivate"].includes(btn.dataset.userAction)) {
        showApprovalModal(user, btn.dataset.userAction);
      } else if (btn.dataset.userAction === "delete") {
        deleteUserAccount(user, btn);
      } else {
        runUserDecision(user, btn.dataset.userAction);
      }
    });
  });

  document.querySelector('#student-registry-refresh')?.addEventListener('click',()=>{state.studentRegistrySkipBaseOnce=false;state.studentRegistryLastLoadedAt=0;showModuleLoadingScreen();renderDashboard();});
  document.querySelectorAll("[data-student-page]").forEach(btn=>btn.addEventListener("click",()=>{
    const page=Number(btn.dataset.studentPage);
    if(!Number.isFinite(page)||page<1)return;
    state.studentRegistryPage=page;
    state.studentRegistrySkipBaseOnce=true;
    renderDashboard();
  }));
  document.querySelectorAll("[data-student-view]").forEach(btn=>btn.addEventListener("click",()=>{state.studentRegistryPage=1;state.studentRegistrySkipBaseOnce=true;state.studentRegistryView=btn.dataset.studentView;renderDashboard();}));
  document.querySelector("#student-year")?.addEventListener("change",e=>{state.studentRegistryAcademicYear=Number(e.currentTarget.value);state.studentRegistryStageCode="all";state.studentRegistryLevelName="all";state.studentRegistryRoomName="all";state.studentRegistryOwnClassId=null;state.studentRegistryScopeInitialized=false;state.studentRegistryPage=1;state.studentRegistrySkipBaseOnce=true;renderDashboard();});
  document.querySelector("#student-sem")?.addEventListener("change",e=>{state.studentRegistrySemester=Number(e.currentTarget.value);state.studentRegistryStageCode="all";state.studentRegistryLevelName="all";state.studentRegistryRoomName="all";state.studentRegistryOwnClassId=null;state.studentRegistryScopeInitialized=false;state.studentRegistryPage=1;state.studentRegistrySkipBaseOnce=true;renderDashboard();});
  document.querySelector("#student-stage")?.addEventListener("change",e=>{state.studentRegistryStageCode=e.currentTarget.value;state.studentRegistryLevelName="all";state.studentRegistryRoomName="all";state.studentRegistryPage=1;state.studentRegistrySkipBaseOnce=true;renderDashboard();});
  document.querySelector("#student-level")?.addEventListener("change",e=>{state.studentRegistryLevelName=e.currentTarget.value;state.studentRegistryRoomName="all";state.studentRegistryPage=1;state.studentRegistrySkipBaseOnce=true;renderDashboard();});
  document.querySelector("#student-room")?.addEventListener("change",e=>{state.studentRegistryRoomName=e.currentTarget.value;state.studentRegistryPage=1;state.studentRegistrySkipBaseOnce=true;renderDashboard();});
  document.querySelector("#student-search")?.addEventListener("change",e=>{state.studentRegistrySearch=e.currentTarget.value;state.studentRegistryPage=1;state.studentRegistrySkipBaseOnce=true;renderDashboard();});
  document.querySelector("#student-own-class")?.addEventListener("change",e=>{state.studentRegistryOwnClassId=e.currentTarget.value;state.studentRegistryScopeInitialized=false;studentApplyRoleScope();state.studentRegistryPage=1;state.studentRegistrySkipBaseOnce=true;renderDashboard();});
  document.querySelector("#student-filter-reset")?.addEventListener("click",()=>{state.studentRegistryStageCode="all";state.studentRegistryLevelName="all";state.studentRegistryRoomName="all";state.studentRegistrySearch="";state.studentRegistryScopeInitialized=true;state.studentRegistryPage=1;state.studentRegistrySkipBaseOnce=true;renderDashboard();});
  document.querySelector("#student-filter-my-homeroom")?.addEventListener("click",()=>{state.studentRegistryScopeInitialized=false;studentApplyRoleScope();state.studentRegistryPage=1;state.studentRegistrySkipBaseOnce=true;renderDashboard();});
  document.querySelector("#student-filter-all")?.addEventListener("click",()=>{state.studentRegistryStageCode="all";state.studentRegistryLevelName="all";state.studentRegistryRoomName="all";state.studentRegistrySearch="";state.studentRegistryScopeInitialized=true;state.studentRegistryPage=1;state.studentRegistrySkipBaseOnce=true;renderDashboard();});
  document.querySelectorAll("[data-student-detail]").forEach(btn=>btn.addEventListener("click",()=>studentDetailModal(btn.dataset.studentDetail)));
  document.querySelectorAll("[data-student-exit]").forEach(btn=>btn.addEventListener("click",()=>studentExitEnrollmentModal(btn.dataset.studentExit)));
  document.querySelectorAll("#student-import-open,#student-import-open-2,#student-empty-import").forEach(btn=>btn.addEventListener("click",()=>studentImportModal()));
  document.querySelectorAll("[data-student-import-review]").forEach(btn=>btn.addEventListener("click",()=>studentImportReconciliationModal(btn.dataset.studentImportReview)));
  document.querySelector("#student-seed-import")?.addEventListener("click",()=>openStudentSeedImport());
  document.querySelector("#student-template-download")?.addEventListener("click",()=>studentTemplateDownload());
  document.querySelectorAll("#student-export-xlsx,#student-export-xlsx-2").forEach(btn=>btn.addEventListener("click",()=>studentExportXlsx()));
  document.querySelector("#student-export-pdf")?.addEventListener("click",()=>studentRegistryPdf());
  document.querySelector("#student-list-pdf")?.addEventListener("click",()=>studentClassListPdf());
  document.querySelector("#student-list-xlsx")?.addEventListener("click",()=>studentClassListXlsx());
  document.querySelector("#student-room-add")?.addEventListener("click",()=>studentRoomModal());
  document.querySelector("#student-academic-year-add")?.addEventListener("click",()=>studentAcademicYearModal());
  document.querySelector("#student-set-current-term")?.addEventListener("click",()=>setStudentCurrentAcademicTerm());
  document.querySelector("#student-copy-semester")?.addEventListener("click",()=>copyStudentRegistryToSemester2());
  document.querySelectorAll("[data-student-room-toggle]").forEach(btn=>btn.addEventListener("click",async()=>{const c=state.studentRegistryClasses.find(x=>x.id===btn.dataset.studentRoomToggle);if(!c)return;if(c.is_active&&!confirm(`ปิดใช้งานห้อง ${schoolClassLabel(c)} หรือไม่?\n\nรายชื่อนักเรียนจะไม่ถูกลบ และคุณสามารถเปิดห้องนี้กลับมาได้จากหน้านี้`))return;const {error}=await supabase.from("school_classes").update({is_active:!c.is_active}).eq("id",c.id);if(error)return toast("เปลี่ยนสถานะห้องไม่สำเร็จ",error.message,"error");toast(c.is_active?"ปิดใช้งานห้องแล้ว":"เปิดใช้งานห้องแล้ว",`${schoolClassLabel(c)} · รายชื่อนักเรียนยังคงอยู่ครบ`,"success");await renderDashboard();}));
  document.querySelector("#student-promotion-apply")?.addEventListener("click",()=>applyStudentPromotion());
  document.querySelectorAll(".promotion-decision").forEach(sel=>sel.addEventListener("change",()=>{const tr=sel.closest("[data-promotion-row]"),target=tr?.querySelector(".promotion-target");if(target){target.disabled=sel.value!=="promoted";if(sel.value!=="promoted")target.value="";}}));
  document.querySelector("#student-card-certifier-settings")?.addEventListener("click",()=>studentCardCertifierSettingsModal());
  document.querySelector("#student-card-own-class")?.addEventListener("change",e=>{state.studentCardOwnClassId=e.currentTarget.value;state.studentCardScopeInitialized=false;studentCardApplyRoleScope();renderDashboard();});
  document.querySelector("#card-year")?.addEventListener("change",e=>{state.studentCardAcademicYear=Number(e.currentTarget.value);state.studentCardStageCode="all";state.studentCardLevelName="all";state.studentCardRoomName="all";state.studentCardOwnClassId=null;state.studentCardScopeInitialized=false;renderDashboard();});
  document.querySelector("#card-sem")?.addEventListener("change",e=>{state.studentCardSemester=Number(e.currentTarget.value);state.studentCardStageCode="all";state.studentCardLevelName="all";state.studentCardRoomName="all";state.studentCardOwnClassId=null;state.studentCardScopeInitialized=false;renderDashboard();});
  document.querySelector("#card-stage")?.addEventListener("change",e=>{state.studentCardStageCode=e.currentTarget.value;state.studentCardLevelName="all";state.studentCardRoomName="all";renderDashboard();});
  document.querySelector("#card-level")?.addEventListener("change",e=>{state.studentCardLevelName=e.currentTarget.value;state.studentCardRoomName="all";renderDashboard();});
  document.querySelector("#card-room")?.addEventListener("change",e=>{state.studentCardRoomName=e.currentTarget.value;renderDashboard();});
  document.querySelector("#card-filter-my-homeroom")?.addEventListener("click",()=>{state.studentCardScopeInitialized=false;studentCardApplyRoleScope();renderDashboard();});
  document.querySelector("#card-filter-all")?.addEventListener("click",()=>{state.studentCardStageCode='all';state.studentCardLevelName='all';state.studentCardRoomName='all';state.studentCardSearch='';state.studentCardScopeInitialized=true;renderDashboard();});
  document.querySelector("#card-search")?.addEventListener("change",e=>{state.studentCardSearch=e.currentTarget.value;renderDashboard();});
  document.querySelector("#student-card-check-all")?.addEventListener("change",e=>document.querySelectorAll(".student-card-check").forEach(x=>x.checked=e.currentTarget.checked));
  document.querySelectorAll("[data-student-card-preview]").forEach(btn=>btn.addEventListener("click",()=>studentCardPreview(btn.dataset.studentCardPreview)));
  document.querySelectorAll("[data-student-card-issue]").forEach(btn=>btn.addEventListener("click",()=>studentCardIssueModal([btn.dataset.studentCardIssue])));
  document.querySelectorAll("[data-student-card-photo]").forEach(btn=>btn.addEventListener("click",()=>studentCardPhotoModal(btn.dataset.studentCardPhoto)));
  document.querySelectorAll("[data-student-card-revoke]").forEach(btn=>btn.addEventListener("click",()=>revokeStudentCard(btn.dataset.studentCardRevoke)));
  document.querySelector("#student-card-issue-selected")?.addEventListener("click",()=>{const ids=[...document.querySelectorAll(".student-card-check:checked")].map(x=>x.value);if(!ids.length)return toast("กรุณาเลือกนักเรียน","เลือกอย่างน้อย 1 คน","error");studentCardIssueModal(ids);});
  document.querySelector("#student-card-print-selected")?.addEventListener("click",()=>{const ids=[...document.querySelectorAll(".student-card-check:checked")].map(x=>x.value);if(!ids.length)return toast("กรุณาเลือกนักเรียน","เลือกอย่างน้อย 1 คน","error");studentCardBatchPrint(ids);});
  document.querySelector("#student-card-print-filtered")?.addEventListener("click",()=>studentCardBatchPrint(studentCardVisibleEnrollments().map(e=>e.student_id)));
  document.querySelector("#home-visit-period-settings")?.addEventListener("click",()=>homeVisitPeriodSettingsModal());

  document.querySelectorAll("#new-home-visit").forEach(btn=>btn.addEventListener("click",()=>homeVisitCreateModal()));
  document.querySelector("#hv-year")?.addEventListener("change",e=>{state.homeVisitAcademicYear=Number(e.currentTarget.value);state.homeVisitClassId=null;state.homeVisitScopeInitialized=false;renderDashboard();});
  document.querySelector("#hv-sem")?.addEventListener("change",e=>{state.homeVisitSemester=Number(e.currentTarget.value);state.homeVisitClassId=null;state.homeVisitScopeInitialized=false;renderDashboard();});
  document.querySelector("#hv-class")?.addEventListener("change",e=>{state.homeVisitClassId=e.currentTarget.value;state.homeVisitScopeInitialized=true;renderDashboard();});
  document.querySelectorAll("[data-open-home-visit]").forEach(btn=>btn.addEventListener("click",()=>{state.selectedHomeVisitId=btn.dataset.openHomeVisit;state.homeVisitStep=1;renderDashboard();}));
  document.querySelector("#home-visit-back")?.addEventListener("click",()=>{state.selectedHomeVisitId=null;state.homeVisitStep=1;renderDashboard();});
  document.querySelector("#delete-home-visit-record")?.addEventListener("click",()=>deleteSelectedHomeVisitRecord());

  document.querySelectorAll("[data-hv-step]").forEach(btn=>btn.addEventListener("click",()=>{state.homeVisitStep=Number(btn.dataset.hvStep);renderDashboard();}));
  document.querySelector("#hv-prev")?.addEventListener("click",()=>{state.homeVisitStep=Math.max(1,state.homeVisitStep-1);renderDashboard();});
  document.querySelector("#hv-next")?.addEventListener("click",async()=>{const r=homeVisitRecord();if(r&&await saveHomeVisitStep(r)){state.homeVisitStep=Math.min(6,state.homeVisitStep+1);renderDashboard();}});
  document.querySelector("#hv-save-step")?.addEventListener("click",async()=>{const r=homeVisitRecord();if(r)await saveHomeVisitStep(r);});
  document.querySelector("#hv-add-member")?.addEventListener("click",()=>{const body=document.querySelector("#hv-members-body"),count=body?.children.length||0;if(count>=10)return toast("สมาชิกสูงสุด 10 คน","ตามแบบ นร./กสศ.01 รองรับสมาชิก 1-10 คน","error");const tmp=document.createElement("tbody");tmp.innerHTML=householdRowsHtml({id:homeVisitRecord().id}).match(/<tbody id="hv-members-body">([\s\S]*?)<\/tbody>/)?.[1]||"";const row=tmp.querySelector("tr");if(row){row.querySelector("td").textContent=count+1;row.dataset.hvMember=`new-${count}`;body.appendChild(row);}});
  document.querySelector("#hv-members-body")?.addEventListener("click",e=>{const b=e.target.closest(".hv-member-remove");if(!b)return;const rows=[...document.querySelectorAll("#hv-members-body tr")];if(rows.length<=1)return;b.closest("tr")?.remove();[...document.querySelectorAll("#hv-members-body tr")].forEach((r,i)=>r.children[0].textContent=i+1);});
  document.querySelectorAll("[data-hv-photo-file]").forEach(input=>input.addEventListener("change",()=>{const file=input.files?.[0];if(file)showHomeVisitLocalPhotoPreview(input.dataset.hvPhotoFile,file);}));
  document.querySelectorAll("[data-upload-hv-photo]").forEach(btn=>btn.addEventListener("click",()=>{const r=homeVisitRecord();if(r)uploadHomeVisitPhoto(r,btn.dataset.uploadHvPhoto);}));
  if(state.currentView==="module:home_visit_management"&&state.selectedHomeVisitId)hydrateHomeVisitPhotoPreviews();
  document.querySelectorAll("[data-hv-sign]").forEach(btn=>btn.addEventListener("click",()=>{const r=homeVisitRecord();if(r)homeVisitSignatureModal(r,btn.dataset.hvSign);}));
  document.querySelector("#toggle-home-visit-complete")?.addEventListener("click",async()=>{
   const r=homeVisitRecord();if(!r)return;
   if(r.status!=="complete")return bnkSignatureBeforeAction("เลือกลายเซ็นก่อนยืนยันเยี่ยมบ้านเสร็จสมบูรณ์",async choice=>{
     await bnkRecordActionSignature("home_visit",r.id,"complete",choice);
     const {error}=await supabase.from("home_visit_records").update({status:"complete"}).eq("id",r.id);
     if(error)throw error;toast("บันทึกการเยี่ยมบ้านและลายเซ็นแล้ว","","success");await renderDashboard();
   });
   const {error}=await supabase.from("home_visit_records").update({status:"draft"}).eq("id",r.id);
   if(error)return toast("เปลี่ยนสถานะไม่สำเร็จ",error.message,"error");await renderDashboard();
 });
  document.querySelectorAll("[data-export-home-visit]").forEach(btn=>btn.addEventListener("click",()=>{const r=state.homeVisitRecords.find(x=>x.id===btn.dataset.exportHomeVisit);if(r)homeVisitPdfPreview(r);}));
  document.querySelector("#export-home-visit-class")?.addEventListener("click",()=>homeVisitPdfPreview(homeVisitFilteredRecords()));
  document.querySelector("#export-all-class-timetables")?.addEventListener("click",()=>{const ids=timetableFilteredClasses({visibleOnly:true}).filter(c=>new Set(timetableStudentExportClassIds()).has(c.id)).map(c=>c.id);timetableBatchPdfPreview("class",ids);});
  document.querySelector("#export-all-teacher-timetables")?.addEventListener("click",()=>timetableBatchPdfPreview("teacher",state.timetableTeachers.map(t=>t.id)));

  document.querySelector("#budget-fiscal-year")?.addEventListener("change",e=>{state.budgetFiscalYear=Number(e.currentTarget.value);renderDashboard();});
  document.querySelectorAll("[data-budget-registry-dept]").forEach(btn=>btn.addEventListener("click",()=>{state.budgetRegistryDepartmentFilter=btn.dataset.budgetRegistryDept;renderDashboard();}));
  document.querySelector("#budget-control-settings")?.addEventListener("click",()=>budgetControlSettingsModal());
  document.querySelector("#configure-budget-signers")?.addEventListener("click",()=>{const r=selectedBudgetRequest();if(r)budgetSignersModal(r);});
  document.querySelectorAll("[data-sign-budget-slot]").forEach(btn=>btn.addEventListener("click",()=>{const r=selectedBudgetRequest();if(r)budgetSignerActionModal(r,btn.dataset.signBudgetSlot);}));
  document.querySelectorAll("[data-project-view]").forEach(btn=>btn.addEventListener("click",()=>{state.projectView=btn.dataset.projectView;state.selectedProjectId=null;state.selectedProjectActivityId=null;state.selectedDisbursementId=null;renderDashboard();}));
  document.querySelector("#project-year")?.addEventListener("change",e=>{state.projectAcademicYear=Number(e.currentTarget.value);renderDashboard();});
  document.querySelectorAll("[data-project-department]").forEach(btn=>btn.addEventListener("click",()=>{state.projectDepartmentFilter=btn.dataset.projectDepartment;renderDashboard();}));
  document.querySelectorAll("#new-school-project").forEach(btn=>btn.addEventListener("click",()=>projectModal()));
  document.querySelectorAll("[data-edit-project]").forEach(btn=>btn.addEventListener("click",()=>{const p=state.schoolProjects.find(x=>x.id===btn.dataset.editProject);if(p)projectModal(p);}));
  document.querySelectorAll("[data-toggle-project]").forEach(btn=>btn.addEventListener("click",()=>{btn.classList.toggle("open");document.querySelector(`[data-project-activities="${btn.dataset.toggleProject}"]`)?.classList.toggle("open");}));
  document.querySelectorAll("[data-open-project]").forEach(btn=>btn.addEventListener("click",()=>{state.selectedProjectId=btn.dataset.openProject;state.selectedProjectActivityId=null;state.selectedDisbursementId=null;renderDashboard();}));
  document.querySelector("#project-back")?.addEventListener("click",()=>{state.selectedProjectId=null;state.selectedProjectActivityId=null;renderDashboard();});
  document.querySelector("#delete-school-project")?.addEventListener("click",()=>deleteSelectedProject());

  document.querySelector("#new-project-activity")?.addEventListener("click",()=>{const p=selectedProject();if(p)projectActivityModal(p);});
  document.querySelectorAll("[data-open-activity]").forEach(btn=>btn.addEventListener("click",()=>{const a=state.projectActivities.find(x=>x.id===btn.dataset.openActivity);if(a){state.selectedProjectId=a.project_id;state.selectedProjectActivityId=a.id;renderDashboard();}}));
  document.querySelector("#activity-back")?.addEventListener("click",()=>{state.selectedProjectActivityId=null;renderDashboard();});
  document.querySelector("#delete-project-activity")?.addEventListener("click",()=>deleteSelectedProjectActivity());

  document.querySelectorAll("[data-new-budget-activity]").forEach(btn=>btn.addEventListener("click",()=>{const a=state.projectActivities.find(x=>x.id===btn.dataset.newBudgetActivity),p=state.schoolProjects.find(x=>x.id===a?.project_id);if(p&&a)budgetRequestModal(p,a);}));
  document.querySelectorAll("[data-new-budget-project]").forEach(btn=>btn.addEventListener("click",()=>{const p=state.schoolProjects.find(x=>x.id===btn.dataset.newBudgetProject);if(p)budgetRequestModal(p);}));
  document.querySelectorAll("[data-open-budget-request]").forEach(btn=>btn.addEventListener("click",()=>{state.selectedProjectId=null;state.selectedProjectActivityId=null;state.selectedDisbursementId=btn.dataset.openBudgetRequest;state.projectView="budget";renderDashboard();}));
  document.querySelector("#budget-request-back")?.addEventListener("click",()=>{state.selectedDisbursementId=null;state.projectView="budget";renderDashboard();});
  document.querySelector("#delete-budget-request")?.addEventListener("click",()=>deleteSelectedBudgetRequest());

  document.querySelector("#prepare-budget-request")?.addEventListener("click",()=>{const r=selectedBudgetRequest();if(r)prepareBudgetRequest(r);});
  document.querySelector("#budget-request-pdf")?.addEventListener("click",()=>{const r=selectedBudgetRequest();if(r)budgetRequestPdfPreview(r);});
  document.querySelector("#mark-budget-paid")?.addEventListener("click",async()=>{const r=selectedBudgetRequest();if(!r||!confirm(`บันทึกว่าเบิกจ่าย ${money(r.amount)} บาท แล้วหรือไม่?`))return;const {error}=await supabase.from("budget_disbursements").update({status:"paid"}).eq("id",r.id);if(error)return toast("บันทึกไม่สำเร็จ",error.message,"error");await renderDashboard();});
  document.querySelector("#project-pdf")?.addEventListener("click",()=>{const p=selectedProject();if(p)projectPdfPreview(p);});
  document.querySelector("#activity-pdf")?.addEventListener("click",()=>{const a=state.projectActivities.find(x=>x.id===state.selectedProjectActivityId),p=state.schoolProjects.find(x=>x.id===a?.project_id);if(p&&a)projectPdfPreview(p,a);});
  document.querySelectorAll("[data-notification-central]").forEach(el=>el.addEventListener("click",()=>openCentralApprovalNotification(el.dataset.notificationCentral)));
  document.querySelectorAll("[data-notification-budget]").forEach(el=>el.addEventListener("click",async()=>{const id=el.dataset.notificationBudget;await supabase.from("notifications").update({read_at:new Date().toISOString()}).eq("recipient_id",state.user.id).eq("entity_type","budget_disbursement").eq("entity_id",id);state.currentView="module:project_management";state.projectView="budget";state.selectedDisbursementId=id;await loadActiveUserData();await renderDashboard();}));

  document.querySelectorAll("[data-user-academic]").forEach(btn => btn.addEventListener("click", () => {
    const user=state.pendingUsers.find(u=>u.id===btn.dataset.userAcademic);
    if(user) timetableTeacherCapabilityModal(user);
  }));

  document.querySelector("#preschool-staff-roster")?.addEventListener("click",()=>preschoolRosterModal());
  document.querySelector("#add-preschool-unit")?.addEventListener("click",()=>preschoolUnitModal());
  document.querySelectorAll("[data-edit-preschool-unit]").forEach(btn=>btn.addEventListener("click",()=>preschoolUnitModal(btn.dataset.editPreschoolUnit)));
  document.querySelectorAll("[data-delete-preschool-unit]").forEach(btn=>btn.addEventListener("click",()=>deletePreschoolUnit(btn.dataset.deletePreschoolUnit)));
  document.querySelector("#export-preschool-unit-list")?.addEventListener("click",()=>timetablePdfPreview("class",state.timetableSelectedClassId));
  if(state.currentView==="module:timetable_management")timetableConstraintFeature.bind();
  document.querySelectorAll("[data-timetable-view]").forEach(btn=>btn.addEventListener("click",()=>{
    state.timetableView=btn.dataset.timetableView;
    renderTimetableNavigation();
  }));
  document.querySelector("#timetable-refresh-workspace")?.addEventListener("click",()=>{
    state.timetableSkipNextLoad=false;
    state.timetableLastLoadedAt=0;
    showModuleLoadingScreen();
    renderDashboard();
  });
  document.querySelector("#timetable-year")?.addEventListener("change",e=>{state.timetableAcademicYear=Number(e.currentTarget.value);state.timetableSelectedClassId=null;state.timetableSubjectMasterScope=null;state.timetableExportClassId=null;state.timetableSkipNextLoad=false;renderDashboard();});
  document.querySelector("#timetable-semester")?.addEventListener("change",e=>{state.timetableSemester=Number(e.currentTarget.value);state.timetableSelectedClassId=null;state.timetableSubjectMasterScope=null;state.timetableExportClassId=null;state.timetableSkipNextLoad=false;renderDashboard();});
  document.querySelector("#timetable-sync-p33-staff")?.addEventListener("click",async()=>{
    const names=["ครูตัวอย่าง 1","ครูตัวอย่าง 2","ครูตัวอย่าง 3"];
    const users=names.map(name=>state.timetableTeachers.find(t=>(t.full_name||"").trim()===name&&t.role==="teacher"));
    if(users.some(x=>!x))return toast("ยังไม่มีบัญชีครูจริงครบสามคน","สมัครและอนุมัติบัญชีก่อน","error");
    if(!confirm("ยืนยันมอบหมาย 22 รายวิชา รวม 35 คาบ ให้บัญชีครูจริงทั้งสามสำหรับห้อง ป.3/3?"))return;
    const {data,error}=await supabase.rpc("timetable_assign_p33_staff",{p_teacher_ids:users.map(x=>x.id)});
    if(error)return toast("มอบหมายรายวิชาไม่สำเร็จ",error.message,"error");
    toast("มอบหมายรายวิชาให้ ป.3/3 สำเร็จ",(data?.subjects||0)+" รายวิชา · "+(data?.periods||0)+" คาบ","success");
    await renderDashboard();
  });
  document.querySelector("#timetable-class-select")?.addEventListener("change",e=>{state.timetableSelectedClassId=e.currentTarget.value||null;renderTimetableNavigation();});
  document.querySelectorAll("[data-select-timetable-class]").forEach(btn=>btn.addEventListener("click",()=>{state.timetableSelectedClassId=btn.dataset.selectTimetableClass;renderTimetableNavigation();}));
  document.querySelectorAll("#new-timetable-class").forEach(btn=>btn.addEventListener("click",()=>timetableClassModal()));
  document.querySelector("#timetable-master-class-select")?.addEventListener("change",e=>{
    state.timetableSubjectMasterScope=e.currentTarget.value;
    if(e.currentTarget.value!=="preschool")state.timetableSelectedClassId=e.currentTarget.value;
    renderTimetableNavigation();
  });
  document.querySelectorAll("#new-timetable-subject").forEach(btn=>btn.addEventListener("click",()=>timetableSubjectModal()));
  document.querySelector("#copy-timetable-subjects")?.addEventListener("click",()=>timetableCopySubjectsModal());
  document.querySelectorAll("[data-copy-timetable-subject]").forEach(btn=>btn.addEventListener("click",()=>timetableCopySubjectsModal(btn.dataset.subjectClass,btn.dataset.copyTimetableSubject)));
  document.querySelectorAll("[data-edit-timetable-subject]").forEach(btn=>btn.addEventListener("click",()=>timetableEditSubjectModal(btn.dataset.subjectClass,btn.dataset.editTimetableSubject)));
  document.querySelectorAll("#new-teaching-assignment").forEach(btn=>btn.addEventListener("click",()=>teachingAssignmentModal()));
  document.querySelectorAll("[data-open-period-settings]").forEach(btn=>btn.addEventListener("click",()=>{state.timetableView="periods";renderDashboard();}));
  document.querySelectorAll("[data-configure-periods]").forEach(btn=>btn.addEventListener("click",()=>openTimetablePeriodModal(btn.dataset.configurePeriods)));
  document.querySelectorAll("[data-period-mode-shared]").forEach(btn=>btn.addEventListener("click",()=>setTimetablePeriodMode(btn.dataset.periodModeShared,"shared")));
  document.querySelectorAll("[data-period-mode-custom]").forEach(btn=>btn.addEventListener("click",()=>setTimetablePeriodMode(btn.dataset.periodModeCustom,"custom")));
  document.querySelector("#edit-school-period-template")?.addEventListener("click",()=>timetableSchoolPeriodTemplateModal());
  document.querySelector("#create-school-period-template")?.addEventListener("click",()=>timetableSchoolPeriodTemplateModal());
  document.querySelector("#apply-school-periods-all")?.addEventListener("click",()=>applySchoolPeriodTemplateToAll());
  document.querySelector("#toggle-timetable-publish")?.addEventListener("click",()=>toggleTimetablePublish());
  document.querySelector("#clear-timetable")?.addEventListener("click",()=>clearSelectedTimetable());
  document.querySelectorAll("[data-remove-timetable-entry]").forEach(btn=>btn.addEventListener("click",async e=>{
    e.stopPropagation();const {error}=await supabase.from("timetable_entries").delete().eq("id",btn.dataset.removeTimetableEntry);if(error)return toast("นำคาบออกไม่ได้",error.message,"error");await renderDashboard();
  }));
  document.querySelectorAll("[data-joint-activity-entry]").forEach(btn=>btn.addEventListener("click",e=>{
    e.stopPropagation();
    const entry=state.timetableEntries.find(x=>x.id===btn.dataset.jointActivityEntry);
    if(!entry)return;
    openJointActivityModal({
      entry,classes:state.timetableClasses,profiles:state.timetableProfiles,periods:state.timetablePeriods,
      assignments:state.timetableAssignments,entries:state.timetableEntries,
      teachers:state.timetableTeachers,activities:state.timetableJointActivities || [],
      members:state.timetableJointTeachers || [],canManageClass:canManageTimetableClassLocal,
      notify:toast,refresh:renderDashboard,supabase,esc:escapeHtml,
      classLabel:schoolClassLabel,teacherName:timetableTeacherName,
      subjectName:id=>state.timetableSubjects.find(x=>x.id===id)?.subject_name || "",
      dayLabel:day=>TIMETABLE_DAY_LABEL[day] || String(day)
    });
  }));
  document.querySelectorAll("[data-delete-timetable-class]").forEach(btn=>btn.addEventListener("click",async()=>{
    const c=state.timetableClasses.find(x=>x.id===btn.dataset.deleteTimetableClass);if(!c||!confirm(`ลบ ${schoolClassLabel(c)} และข้อมูลตารางทั้งหมดหรือไม่?`))return;
    const {error}=await supabase.from("school_classes").delete().eq("id",c.id);if(error)return toast("ลบชั้น/ห้องไม่สำเร็จ",error.message,"error");state.timetableSelectedClassId=null;await renderDashboard();
  }));
  document.querySelectorAll("[data-delete-timetable-subject]").forEach(btn=>btn.addEventListener("click",async()=>{
    const subject=state.timetableSubjects.find(s=>s.id===btn.dataset.deleteTimetableSubject);
    const c=state.timetableClasses.find(c=>c.id===btn.dataset.subjectClass);
    if(!subject||!c)return;
    const linked=state.timetableAssignments.filter(a=>a.class_id===c.id&&a.subject_id===subject.id).length;
    if(!confirm(`นำวิชา “${subject.subject_name}” ออกจาก Master ของ ${schoolClassLabel(c)} หรือไม่?${linked?`\n\nห้องนี้มีการมอบหมายสอน ${linked} รายการ ซึ่งจะถูกเก็บไว้เพื่อไม่ให้ตารางและเอกสารเดิมเสียหาย`:""}\n\nสามารถคืนรายวิชาเข้าห้องภายหลังได้`))return;
    const {error}=await supabase.from("academic_class_subject_offerings").update({is_active:false}).eq("class_id",c.id).eq("subject_id",subject.id);
    if(error)return toast("นำรายวิชาออกไม่ได้",error.message,"error");toast("นำวิชาออกจากห้องแล้ว","ตารางสอนและเอกสารเดิมยังอยู่","success");await renderDashboard();
  }));
  document.querySelectorAll("[data-restore-timetable-subject]").forEach(btn=>btn.addEventListener("click",async()=>{
    const {error}=await supabase.from("academic_class_subject_offerings").update({is_active:true}).eq("class_id",btn.dataset.subjectClass).eq("subject_id",btn.dataset.restoreTimetableSubject);
    if(error)return toast("คืนรายวิชาไม่ได้",error.message,"error");toast("คืนรายวิชาแล้ว","","success");await renderDashboard();
  }));
  document.querySelectorAll("[data-delete-teaching-assignment]").forEach(btn=>btn.addEventListener("click",async()=>{
    if(!confirm("ยกเลิกการกำหนดวิชา/ครูนี้หรือไม่?\n\nรายการจะหายจากหน้าจัดตารางสอน แต่ข้อสอบ คะแนนสอบ และเอกสารย้อนหลังจะยังอยู่ครบ\n\nหากรายการยังมีคาบในตาราง ต้องนำคาบออกก่อน"))return;
    buttonLoading(btn,true,"กำลังยกเลิก...");
    try {
      const result=await archiveTeachingAssignment(btn.dataset.deleteTeachingAssignment);
      if(result.blocked)return toast("ยังยกเลิกการกำหนดการสอนไม่ได้",`มีคาบที่จัดไว้ ${result.periods} คาบ กรุณานำคาบออกจากตารางสอนก่อน`,"error");
      if(result.error)return toast("ยกเลิกการกำหนดการสอนไม่สำเร็จ",result.error.message,"error");
      toast("ยกเลิกการกำหนดการสอนแล้ว","เก็บชุดข้อสอบ ผลสอบ และเอกสารเดิมไว้ สามารถเพิ่มวิชา/ครูเดิมเพื่อคืนรายการนี้ได้","success");
      await renderDashboard();
    } catch(error){toast("ยกเลิกการกำหนดการสอนไม่สำเร็จ",error?.message||"เกิดข้อผิดพลาด","error");}
    finally { buttonLoading(btn,false); }
  }));
  document.querySelectorAll("[data-timetable-assignment-drag]").forEach(el=>el.addEventListener("dragstart",e=>e.dataTransfer.setData("text/plain",JSON.stringify({kind:"assignment",id:el.dataset.timetableAssignmentDrag}))));
  document.querySelectorAll("[data-timetable-entry-drag]").forEach(el=>el.addEventListener("dragstart",e=>e.dataTransfer.setData("text/plain",JSON.stringify({kind:"entry",id:el.dataset.timetableEntryDrag}))));
  document.querySelectorAll("[data-timetable-drop]").forEach(cell=>{
    cell.addEventListener("dragover",e=>{e.preventDefault();cell.classList.add("drag-over");});
    cell.addEventListener("dragleave",()=>cell.classList.remove("drag-over"));
    cell.addEventListener("drop",async e=>{e.preventDefault();cell.classList.remove("drag-over");try{const payload=JSON.parse(e.dataTransfer.getData("text/plain"));await dropTimetableItem(payload,cell.dataset.day,cell.dataset.periodId);}catch{toast("ลากวางไม่สำเร็จ","ข้อมูล Drag & Drop ไม่ถูกต้อง","error");}});
  });
  document.querySelector("#timetable-export-class")?.addEventListener("change",e=>state.timetableExportClassId=e.currentTarget.value||null);
  document.querySelector("#timetable-export-teacher")?.addEventListener("change",e=>state.timetableExportTeacherId=e.currentTarget.value||state.user.id);
  document.querySelector("#export-class-timetable")?.addEventListener("click",()=>timetablePdfPreview("class",state.timetableExportClassId));
  document.querySelector("#export-teacher-timetable")?.addEventListener("click",()=>timetablePdfPreview("teacher",state.timetableExportTeacherId||state.user.id));
  document.querySelectorAll("[data-export-class-timetable]").forEach(btn=>btn.addEventListener("click",()=>timetablePdfPreview("class",btn.dataset.exportClassTimetable)));
  document.querySelectorAll("[data-export-teacher-timetable]").forEach(btn=>btn.addEventListener("click",()=>timetablePdfPreview("teacher",btn.dataset.exportTeacherTimetable)));
  document.querySelectorAll("[data-preview-class-timetable]").forEach(btn=>btn.addEventListener("click",()=>{state.timetableSelectedClassId=btn.dataset.previewClassTimetable;state.timetableView="homeroom";timetablePdfPreview("class",btn.dataset.previewClassTimetable);}));

  document.querySelectorAll("[data-plan-mode]").forEach(btn => btn.addEventListener("click", () => {
    state.lessonPlanMode = btn.dataset.planMode;
    state.lessonTeacherView = "all";
    state.lessonTeacherId = null;
    state.selectedLessonPlanId = null;
    state.lessonDetail = null;
    renderDashboard();
  }));
  document.querySelector("#change-plan-mode")?.addEventListener("click", () => {
    state.lessonPlanMode = null;
    state.lessonTeacherView = "all";
    state.lessonTeacherId = null;
    state.selectedLessonPlanId = null;
    state.lessonDetail = null;
    renderDashboard();
  });
  document.querySelectorAll("[data-lesson-view]").forEach(btn => btn.addEventListener("click", () => {
    state.lessonTeacherView = btn.dataset.lessonView;
    if (state.lessonTeacherView !== "teachers") state.lessonTeacherId = null;
    renderDashboard();
  }));
  document.querySelectorAll("[data-teacher-id]").forEach(btn => btn.addEventListener("click", () => {
    state.lessonTeacherView = "teachers";
    state.lessonTeacherId = btn.dataset.teacherId;
    renderDashboard();
  }));
  document.querySelector("#teacher-directory-back")?.addEventListener("click", () => {
    state.lessonTeacherView = "teachers";
    state.lessonTeacherId = null;
    renderDashboard();
  });
  document.querySelector("#new-lesson-plan")?.addEventListener("click", () => lessonPlanModal(null, state.lessonPlanMode || "weekly"));
  document.querySelector("#refresh-lessons")?.addEventListener("click", () => renderDashboard());
  document.querySelector("#manage-signatures")?.addEventListener("click", () => signatureManagerModal());
  document.querySelector("#lesson-detail-back")?.addEventListener("click", () => {
    const type = state.lessonDetail?.plan?.plan_type || "weekly";
    state.lessonPlanMode = type;
    state.selectedLessonPlanId = null;
    state.lessonDetail = null;
    renderDashboard();
  });
  document.querySelector("#preview-a4-plan")?.addEventListener("click", () => lessonA4PreviewModal());
  document.querySelector("#download-approved-pdf")?.addEventListener("click", () => downloadApprovedPdf());
  document.querySelector("#generate-approved-pdf")?.addEventListener("click", e => generateApprovedPdfFromDetail(e.currentTarget));
  document.querySelector("#edit-lesson-plan")?.addEventListener("click", () => lessonPlanModal(state.lessonDetail?.plan));
  document.querySelector("#submit-lesson-plan")?.addEventListener("click", () => submitSelectedLessonPlan());
  document.querySelector("#delete-draft-plan")?.addEventListener("click", () => deleteDraftLessonPlan());
  document.querySelectorAll(".lesson-open").forEach(btn => btn.addEventListener("click", async () => { state.selectedLessonPlanId = btn.dataset.planId; await renderDashboard(); }));
  document.querySelectorAll(".file-open").forEach(btn => btn.addEventListener("click", () => { const f = state.lessonDetail?.files.find(x => x.id === btn.dataset.fileId); if (f) openPrivateFile(f); }));
  document.querySelectorAll(".file-delete").forEach(btn => btn.addEventListener("click", () => { const f = state.lessonDetail?.files.find(x => x.id === btn.dataset.fileId); if (f) deleteLessonFile(f); }));
  document.querySelectorAll("[data-review-role]").forEach(btn => btn.addEventListener("click", () => reviewModal(btn.dataset.reviewRole)));
  document.querySelectorAll(".timeline-signature-preview").forEach(btn => btn.addEventListener("click", () => previewSignature(btn.dataset.sigId)));
}
return {bindDashboardEvents};
}
