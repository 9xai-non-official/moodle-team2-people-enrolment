# Moodle Database Schema & Relations

> Auto-generated reference for the local Moodle **5.3dev** install (database `moodle`, table prefix `mdl_`).

## Overview

- **Tables:** 490
- **Columns:** 4468
- **Logical foreign-key relations:** 611

> **Important:** Moodle does **not** create real foreign-key constraints in the database. Referential integrity is enforced in the application layer, and relations are declared logically in each component's `db/install.xml` (XMLDB) file. The relations below are extracted from those XMLDB definitions.

### Conventions

- Every table has a `bigint` auto-increment **`id`** primary key.
- Columns ending in `id` (e.g. `userid`, `courseid`) are logical references to the `id` of another table.
- `timecreated` / `timemodified` are Unix timestamps.

## All Foreign-Key Relations

Each row: a table column that logically references another table's column.

| From table | From column(s) | → References | Ref column(s) | Unique |
|---|---|---|---|---|
| `ai_action_register` | `userid` | `user` | `id` |  |
| `ai_policy_register` | `userid` | `user` | `id` | yes |
| `analytics_indicator_calc` | `contextid` | `context` | `id` |  |
| `analytics_models` | `usermodified` | `user` | `id` |  |
| `analytics_models_log` | `modelid` | `analytics_models` | `id` |  |
| `analytics_models_log` | `usermodified` | `user` | `id` |  |
| `analytics_predict_samples` | `modelid` | `analytics_models` | `id` |  |
| `analytics_prediction_actions` | `predictionid` | `analytics_predictions` | `id` |  |
| `analytics_prediction_actions` | `userid` | `user` | `id` |  |
| `analytics_predictions` | `modelid` | `analytics_models` | `id` |  |
| `analytics_predictions` | `contextid` | `context` | `id` |  |
| `analytics_train_samples` | `modelid` | `analytics_models` | `id` |  |
| `analytics_used_analysables` | `modelid` | `analytics_models` | `id` |  |
| `analytics_used_files` | `modelid` | `analytics_models` | `id` |  |
| `analytics_used_files` | `fileid` | `files` | `id` |  |
| `assign_allocated_marker` | `student` | `user` | `id` |  |
| `assign_allocated_marker` | `assignment` | `assign` | `id` |  |
| `assign_allocated_marker` | `marker` | `user` | `id` |  |
| `assign_grades` | `assignment` | `assign` | `id` |  |
| `assign_mark` | `assignment` | `assign` | `id` |  |
| `assign_mark` | `gradeid` | `assign_grades` | `id` |  |
| `assign_mark` | `marker` | `user` | `id` |  |
| `assign_overrides` | `assignid` | `assign` | `id` |  |
| `assign_overrides` | `groupid` | `groups` | `id` |  |
| `assign_overrides` | `userid` | `user` | `id` |  |
| `assign_plugin_config` | `assignment` | `assign` | `id` |  |
| `assign_submission` | `assignment` | `assign` | `id` |  |
| `assign_user_flags` | `userid` | `user` | `id` |  |
| `assign_user_flags` | `assignment` | `assign` | `id` |  |
| `assign_user_mapping` | `assignment` | `assign` | `id` |  |
| `assign_user_mapping` | `userid` | `user` | `id` |  |
| `assignfeedback_comments` | `assignment` | `assign` | `id` |  |
| `assignfeedback_comments` | `grade` | `assign_grades` | `id` |  |
| `assignfeedback_editpdf_annot` | `gradeid` | `assign_grades` | `id` |  |
| `assignfeedback_editpdf_annot` | `markid` | `assign_mark` | `id` |  |
| `assignfeedback_editpdf_cmnt` | `gradeid` | `assign_grades` | `id` |  |
| `assignfeedback_editpdf_cmnt` | `markid` | `assign_mark` | `id` |  |
| `assignfeedback_editpdf_quick` | `userid` | `user` | `id` |  |
| `assignfeedback_editpdf_rot` | `gradeid` | `assign_grades` | `id` |  |
| `assignfeedback_editpdf_rot` | `markid` | `assign_mark` | `id` |  |
| `assignfeedback_file` | `assignment` | `assign` | `id` |  |
| `assignfeedback_file` | `grade` | `assign_grades` | `id` |  |
| `assignfeedback_file` | `mark` | `assign_mark` | `id` |  |
| `assignsubmission_file` | `assignment` | `assign` | `id` |  |
| `assignsubmission_file` | `submission` | `assign_submission` | `id` |  |
| `assignsubmission_onlinetext` | `assignment` | `assign` | `id` |  |
| `assignsubmission_onlinetext` | `submission` | `assign_submission` | `id` |  |
| `auth_lti_linked_login` | `userid` | `user` | `id` |  |
| `auth_oauth2_linked_login` | `usermodified` | `user` | `id` |  |
| `auth_oauth2_linked_login` | `userid` | `user` | `id` |  |
| `auth_oauth2_linked_login` | `issuerid` | `oauth2_issuer` | `id` |  |
| `backup_controllers` | `userid` | `user` | `id` |  |
| `backup_logs` | `backupid` | `backup_controllers` | `backupid` |  |
| `badge` | `courseid` | `course` | `id` |  |
| `badge` | `usermodified` | `user` | `id` |  |
| `badge` | `usercreated` | `user` | `id` |  |
| `badge_alignment` | `badgeid` | `badge` | `id` |  |
| `badge_backpack` | `userid` | `user` | `id` |  |
| `badge_backpack` | `externalbackpackid` | `badge_external_backpack` | `id` |  |
| `badge_backpack_oauth2` | `usermodified` | `user` | `id` |  |
| `badge_backpack_oauth2` | `userid` | `user` | `id` |  |
| `badge_backpack_oauth2` | `issuerid` | `oauth2_issuer` | `id` |  |
| `badge_backpack_oauth2` | `externalbackpackid` | `badge_external_backpack` | `id` |  |
| `badge_criteria` | `badgeid` | `badge` | `id` |  |
| `badge_criteria_met` | `critid` | `badge_criteria` | `id` |  |
| `badge_criteria_met` | `userid` | `user` | `id` |  |
| `badge_criteria_met` | `issuedid` | `badge_issued` | `id` |  |
| `badge_criteria_param` | `critid` | `badge_criteria` | `id` |  |
| `badge_endorsement` | `badgeid` | `badge` | `id` |  |
| `badge_external` | `backpackid` | `badge_backpack` | `id` |  |
| `badge_external_backpack` | `oauth2_issuerid` | `oauth2_issuer` | `id` |  |
| `badge_external_identifier` | `sitebackpackid` | `badge_backpack` | `id` |  |
| `badge_issued` | `badgeid` | `badge` | `id` |  |
| `badge_issued` | `userid` | `user` | `id` |  |
| `badge_manual_award` | `badgeid` | `badge` | `id` |  |
| `badge_manual_award` | `recipientid` | `user` | `id` |  |
| `badge_manual_award` | `issuerid` | `user` | `id` |  |
| `badge_manual_award` | `issuerrole` | `role` | `id` |  |
| `badge_related` | `badgeid` | `badge` | `id` |  |
| `badge_related` | `relatedbadgeid` | `badge` | `id` |  |
| `bigbluebuttonbn_recordings` | `bigbluebuttonbnid` | `bigbluebuttonbn` | `id` |  |
| `bigbluebuttonbn_recordings` | `usermodified` | `user` | `id` |  |
| `block_instances` | `parentcontextid` | `context` | `id` |  |
| `block_positions` | `blockinstanceid` | `block_instances` | `id` |  |
| `block_positions` | `contextid` | `context` | `id` |  |
| `block_recentlyaccesseditems` | `userid` | `user` | `id` |  |
| `block_recentlyaccesseditems` | `courseid` | `course` | `id` |  |
| `block_recentlyaccesseditems` | `cmid` | `course_modules` | `id` |  |
| `blog_association` | `contextid` | `context` | `id` |  |
| `blog_association` | `blogid` | `post` | `id` |  |
| `blog_external` | `userid` | `user` | `id` |  |
| `book` | `course` | `course` | `id` |  |
| `choice_answers` | `choiceid` | `choice` | `id` |  |
| `choice_answers` | `optionid` | `choice_options` | `id` |  |
| `choice_options` | `choiceid` | `choice` | `id` |  |
| `cohort` | `contextid` | `context` | `id` |  |
| `cohort_members` | `cohortid` | `cohort` | `id` |  |
| `cohort_members` | `userid` | `user` | `id` |  |
| `comments` | `userid` | `user` | `id` |  |
| `communication` | `contextid` | `context` | `id` |  |
| `communication_customlink` | `commid` | `communication` | `id` |  |
| `communication_user` | `commid` | `communication` | `id` |  |
| `communication_user` | `userid` | `user` | `id` |  |
| `competency` | `scaleid` | `scale` | `id` |  |
| `competency` | `usermodified` | `user` | `id` |  |
| `competency_coursecomp` | `courseid` | `course` | `id` |  |
| `competency_coursecomp` | `competencyid` | `competency` | `id` |  |
| `competency_coursecomp` | `usermodified` | `user` | `id` |  |
| `competency_coursecompsetting` | `courseid` | `course` | `id` | yes |
| `competency_coursecompsetting` | `usermodified` | `user` | `id` |  |
| `competency_evidence` | `contextid` | `context` | `id` |  |
| `competency_evidence` | `actionuserid` | `user` | `id` |  |
| `competency_evidence` | `usermodified` | `user` | `id` |  |
| `competency_framework` | `contextid` | `context` | `id` |  |
| `competency_framework` | `scaleid` | `scale` | `id` |  |
| `competency_framework` | `usermodified` | `user` | `id` |  |
| `competency_modulecomp` | `cmid` | `course_modules` | `id` |  |
| `competency_modulecomp` | `competencyid` | `competency` | `id` |  |
| `competency_modulecomp` | `usermodified` | `user` | `id` |  |
| `competency_plan` | `usermodified` | `user` | `id` |  |
| `competency_plancomp` | `usermodified` | `user` | `id` |  |
| `competency_relatedcomp` | `competencyid` | `competency` | `id` |  |
| `competency_relatedcomp` | `relatedcompetencyid` | `competency` | `id` |  |
| `competency_relatedcomp` | `usermodified` | `user` | `id` |  |
| `competency_template` | `contextid` | `context` | `id` |  |
| `competency_template` | `usermodified` | `user` | `id` |  |
| `competency_templatecohort` | `usermodified` | `user` | `id` |  |
| `competency_templatecomp` | `templateid` | `competency_template` | `id` |  |
| `competency_templatecomp` | `competencyid` | `competency` | `id` |  |
| `competency_templatecomp` | `usermodified` | `user` | `id` |  |
| `competency_usercomp` | `usermodified` | `user` | `id` |  |
| `competency_usercompcourse` | `usermodified` | `user` | `id` |  |
| `competency_usercompplan` | `usermodified` | `user` | `id` |  |
| `competency_userevidence` | `usermodified` | `user` | `id` |  |
| `competency_userevidencecomp` | `usermodified` | `user` | `id` |  |
| `config_log` | `userid` | `user` | `id` |  |
| `contentbank_content` | `contextid` | `context` | `id` |  |
| `contentbank_content` | `usermodified` | `user` | `id` |  |
| `contentbank_content` | `usercreated` | `user` | `id` |  |
| `course` | `originalcourseid` | `course` | `id` |  |
| `course_categories` | `parent` | `course_categories` | `id` |  |
| `course_completion_defaults` | `module` | `modules` | `id` |  |
| `course_completion_defaults` | `course` | `course` | `id` |  |
| `course_format_options` | `courseid` | `course` | `id` |  |
| `course_modules` | `groupingid` | `groupings` | `id` |  |
| `course_published` | `courseid` | `course` | `id` |  |
| `customfield_category` | `contextid` | `context` | `id` |  |
| `customfield_data` | `fieldid` | `customfield_field` | `id` |  |
| `customfield_data` | `contextid` | `context` | `id` |  |
| `customfield_field` | `categoryid` | `customfield_category` | `id` |  |
| `customfield_shared` | `categoryid` | `customfield_category` | `id` |  |
| `customfield_shared` | `usermodified` | `user` | `id` |  |
| `data_content` | `recordid` | `data_records` | `id` |  |
| `data_content` | `fieldid` | `data_fields` | `id` |  |
| `data_fields` | `dataid` | `data` | `id` |  |
| `data_records` | `dataid` | `data` | `id` |  |
| `data_records` | `userid` | `user` | `id` |  |
| `enrol` | `courseid` | `course` | `id` |  |
| `enrol` | `roleid` | `role` | `id` |  |
| `enrol_flatfile` | `courseid` | `course` | `id` |  |
| `enrol_flatfile` | `userid` | `user` | `id` |  |
| `enrol_flatfile` | `roleid` | `role` | `id` |  |
| `enrol_lti_context` | `ltideploymentid` | `enrol_lti_deployment` | `id` |  |
| `enrol_lti_deployment` | `platformid` | `enrol_lti_app_registration` | `id` |  |
| `enrol_lti_lti2_context` | `consumerid` | `enrol_lti_lti2_consumer` | `id` |  |
| `enrol_lti_lti2_nonce` | `consumerid` | `enrol_lti_lti2_consumer` | `id` |  |
| `enrol_lti_lti2_resource_link` | `contextid` | `enrol_lti_lti2_context` | `id` |  |
| `enrol_lti_lti2_resource_link` | `primaryresourcelinkid` | `enrol_lti_lti2_resource_link` | `id` |  |
| `enrol_lti_lti2_resource_link` | `consumerid` | `enrol_lti_lti2_consumer` | `id` |  |
| `enrol_lti_lti2_share_key` | `resourcelinkid` | `enrol_lti_lti2_resource_link` | `id` | yes |
| `enrol_lti_lti2_tool_proxy` | `consumerid` | `enrol_lti_lti2_consumer` | `id` |  |
| `enrol_lti_lti2_user_result` | `resourcelinkid` | `enrol_lti_lti2_resource_link` | `id` |  |
| `enrol_lti_resource_link` | `ltideploymentid` | `enrol_lti_deployment` | `id` |  |
| `enrol_lti_resource_link` | `lticontextid` | `enrol_lti_context` | `id` |  |
| `enrol_lti_tool_consumer_map` | `toolid` | `enrol_lti_tools` | `id` |  |
| `enrol_lti_tool_consumer_map` | `consumerid` | `enrol_lti_lti2_consumer` | `id` |  |
| `enrol_lti_tools` | `enrolid` | `enrol` | `id` |  |
| `enrol_lti_tools` | `contextid` | `context` | `id` |  |
| `enrol_lti_user_resource_link` | `ltiuserid` | `enrol_lti_users` | `id` |  |
| `enrol_lti_user_resource_link` | `resourcelinkid` | `enrol_lti_resource_link` | `id` |  |
| `enrol_lti_users` | `userid` | `user` | `id` |  |
| `enrol_lti_users` | `toolid` | `enrol_lti_tools` | `id` |  |
| `enrol_lti_users` | `ltideploymentid` | `enrol_lti_deployment` | `id` |  |
| `enrol_paypal` | `courseid` | `course` | `id` |  |
| `enrol_paypal` | `userid` | `user` | `id` |  |
| `enrol_paypal` | `instanceid` | `enrol` | `id` |  |
| `event` | `categoryid` | `course_categories` | `id` |  |
| `event` | `subscriptionid` | `event_subscriptions` | `id` |  |
| `event_subscriptions` | `courseid` | `course` | `id` |  |
| `event_subscriptions` | `userid` | `user` | `id` |  |
| `events_queue` | `userid` | `user` | `id` |  |
| `events_queue_handlers` | `queuedeventid` | `events_queue` | `id` |  |
| `events_queue_handlers` | `handlerid` | `events_handlers` | `id` |  |
| `external_services_functions` | `externalserviceid` | `external_services` | `id` |  |
| `external_services_users` | `externalserviceid` | `external_services` | `id` |  |
| `external_services_users` | `userid` | `user` | `id` |  |
| `external_tokens` | `userid` | `user` | `id` |  |
| `external_tokens` | `externalserviceid` | `external_services` | `id` |  |
| `external_tokens` | `contextid` | `context` | `id` |  |
| `external_tokens` | `creatorid` | `user` | `id` |  |
| `favourite` | `contextid` | `context` | `id` |  |
| `favourite` | `userid` | `user` | `id` |  |
| `feedback_completed` | `feedback` | `feedback` | `id` |  |
| `feedback_completed` | `courseid` | `course` | `id` |  |
| `feedback_completedtmp` | `feedback` | `feedback` | `id` |  |
| `feedback_item` | `feedback` | `feedback` | `id` |  |
| `feedback_item` | `template` | `feedback_template` | `id` |  |
| `feedback_sitecourse_map` | `feedbackid` | `feedback` | `id` |  |
| `feedback_value` | `item` | `feedback_item` | `id` |  |
| `feedback_valuetmp` | `item` | `feedback_item` | `id` |  |
| `file_conversion` | `sourcefileid` | `files` | `id` |  |
| `file_conversion` | `destfileid` | `files` | `id` |  |
| `file_conversion` | `usermodified` | `user` | `id` |  |
| `files` | `contextid` | `context` | `id` |  |
| `files` | `userid` | `user` | `id` |  |
| `files` | `referencefileid` | `files_reference` | `id` |  |
| `files_reference` | `repositoryid` | `repository_instances` | `id` |  |
| `filter_active` | `contextid` | `context` | `id` |  |
| `filter_config` | `contextid` | `context` | `id` |  |
| `forum_digests` | `userid` | `user` | `id` |  |
| `forum_digests` | `forum` | `forum` | `id` |  |
| `forum_discussion_subs` | `forum` | `forum` | `id` |  |
| `forum_discussion_subs` | `userid` | `user` | `id` |  |
| `forum_discussion_subs` | `discussion` | `forum_discussions` | `id` |  |
| `forum_discussions` | `forum` | `forum` | `id` |  |
| `forum_discussions` | `usermodified` | `user` | `id` |  |
| `forum_grades` | `forum` | `forum` | `id` |  |
| `forum_posts` | `discussion` | `forum_discussions` | `id` |  |
| `forum_posts` | `parent` | `forum_posts` | `id` |  |
| `forum_queue` | `discussionid` | `forum_discussions` | `id` |  |
| `forum_queue` | `postid` | `forum_posts` | `id` |  |
| `forum_subscriptions` | `forum` | `forum` | `id` |  |
| `glossary_alias` | `entryid` | `glossary_entries` | `id` |  |
| `glossary_categories` | `glossaryid` | `glossary` | `id` |  |
| `glossary_entries` | `glossaryid` | `glossary` | `id` |  |
| `glossary_entries_categories` | `categoryid` | `glossary_categories` | `id` |  |
| `glossary_entries_categories` | `entryid` | `glossary_entries` | `id` |  |
| `grade_categories` | `courseid` | `course` | `id` |  |
| `grade_categories` | `parent` | `grade_categories` | `id` |  |
| `grade_categories_history` | `oldid` | `grade_categories` | `id` |  |
| `grade_categories_history` | `courseid` | `course` | `id` |  |
| `grade_categories_history` | `parent` | `grade_categories` | `id` |  |
| `grade_categories_history` | `loggeduser` | `user` | `id` |  |
| `grade_grades` | `itemid` | `grade_items` | `id` |  |
| `grade_grades` | `userid` | `user` | `id` |  |
| `grade_grades` | `rawscaleid` | `scale` | `id` |  |
| `grade_grades` | `usermodified` | `user` | `id` |  |
| `grade_grades_history` | `oldid` | `grade_grades` | `id` |  |
| `grade_grades_history` | `itemid` | `grade_items` | `id` |  |
| `grade_grades_history` | `userid` | `user` | `id` |  |
| `grade_grades_history` | `rawscaleid` | `scale` | `id` |  |
| `grade_grades_history` | `usermodified` | `user` | `id` |  |
| `grade_grades_history` | `loggeduser` | `user` | `id` |  |
| `grade_import_newitem` | `importer` | `user` | `id` |  |
| `grade_import_values` | `itemid` | `grade_items` | `id` |  |
| `grade_import_values` | `newgradeitem` | `grade_import_newitem` | `id` |  |
| `grade_import_values` | `importer` | `user` | `id` |  |
| `grade_import_values` | `userid` | `user` | `id` |  |
| `grade_items` | `courseid` | `course` | `id` |  |
| `grade_items` | `categoryid` | `grade_categories` | `id` |  |
| `grade_items` | `scaleid` | `scale` | `id` |  |
| `grade_items` | `outcomeid` | `grade_outcomes` | `id` |  |
| `grade_items_history` | `oldid` | `grade_items` | `id` |  |
| `grade_items_history` | `courseid` | `course` | `id` |  |
| `grade_items_history` | `categoryid` | `grade_categories` | `id` |  |
| `grade_items_history` | `scaleid` | `scale` | `id` |  |
| `grade_items_history` | `outcomeid` | `grade_outcomes` | `id` |  |
| `grade_items_history` | `loggeduser` | `user` | `id` |  |
| `grade_outcomes` | `courseid` | `course` | `id` |  |
| `grade_outcomes` | `scaleid` | `scale` | `id` |  |
| `grade_outcomes` | `usermodified` | `user` | `id` |  |
| `grade_outcomes_courses` | `courseid` | `course` | `id` |  |
| `grade_outcomes_courses` | `outcomeid` | `grade_outcomes` | `id` |  |
| `grade_outcomes_history` | `oldid` | `grade_outcomes` | `id` |  |
| `grade_outcomes_history` | `courseid` | `course` | `id` |  |
| `grade_outcomes_history` | `scaleid` | `scale` | `id` |  |
| `grade_outcomes_history` | `loggeduser` | `user` | `id` |  |
| `grade_settings` | `courseid` | `course` | `id` |  |
| `gradepenalty_duedate_rule` | `usermodified` | `user` | `id` |  |
| `grading_areas` | `contextid` | `context` | `id` |  |
| `grading_definitions` | `areaid` | `grading_areas` | `id` |  |
| `grading_definitions` | `usermodified` | `user` | `id` |  |
| `grading_definitions` | `usercreated` | `user` | `id` |  |
| `grading_instances` | `definitionid` | `grading_definitions` | `id` |  |
| `grading_instances` | `raterid` | `user` | `id` |  |
| `gradingform_guide_comments` | `definitionid` | `grading_definitions` | `id` |  |
| `gradingform_guide_criteria` | `definitionid` | `grading_definitions` | `id` |  |
| `gradingform_guide_fillings` | `instanceid` | `grading_instances` | `id` |  |
| `gradingform_guide_fillings` | `criterionid` | `gradingform_guide_criteria` | `id` |  |
| `gradingform_rubric_criteria` | `definitionid` | `grading_definitions` | `id` |  |
| `gradingform_rubric_fillings` | `instanceid` | `grading_instances` | `id` |  |
| `gradingform_rubric_fillings` | `criterionid` | `gradingform_rubric_criteria` | `id` |  |
| `gradingform_rubric_levels` | `criterionid` | `gradingform_rubric_criteria` | `id` |  |
| `groupings` | `courseid` | `course` | `id` |  |
| `groupings_groups` | `groupingid` | `groupings` | `id` |  |
| `groupings_groups` | `groupid` | `groups` | `id` |  |
| `groups` | `courseid` | `course` | `id` |  |
| `groups_members` | `groupid` | `groups` | `id` |  |
| `groups_members` | `userid` | `user` | `id` |  |
| `h5p` | `mainlibraryid` | `h5p_libraries` | `id` |  |
| `h5p_contents_libraries` | `h5pid` | `h5p` | `id` |  |
| `h5p_contents_libraries` | `libraryid` | `h5p_libraries` | `id` |  |
| `h5p_libraries_cachedassets` | `libraryid` | `h5p_libraries` | `id` |  |
| `h5p_library_dependencies` | `libraryid` | `h5p_libraries` | `id` |  |
| `h5p_library_dependencies` | `requiredlibraryid` | `h5p_libraries` | `id` |  |
| `h5pactivity` | `course` | `course` | `id` |  |
| `h5pactivity_attempts` | `h5pactivityid` | `h5pactivity` | `id` |  |
| `h5pactivity_attempts_results` | `attemptid` | `h5pactivity_attempts` | `id` |  |
| `infected_files` | `userid` | `user` | `id` |  |
| `lesson_answers` | `lessonid` | `lesson` | `id` |  |
| `lesson_answers` | `pageid` | `lesson_pages` | `id` |  |
| `lesson_attempts` | `lessonid` | `lesson` | `id` |  |
| `lesson_attempts` | `pageid` | `lesson_pages` | `id` |  |
| `lesson_attempts` | `answerid` | `lesson_answers` | `id` |  |
| `lesson_branch` | `lessonid` | `lesson` | `id` |  |
| `lesson_branch` | `pageid` | `lesson_pages` | `id` |  |
| `lesson_grades` | `lessonid` | `lesson` | `id` |  |
| `lesson_overrides` | `lessonid` | `lesson` | `id` |  |
| `lesson_overrides` | `groupid` | `groups` | `id` |  |
| `lesson_overrides` | `userid` | `user` | `id` |  |
| `lesson_pages` | `lessonid` | `lesson` | `id` |  |
| `lesson_timer` | `lessonid` | `lesson` | `id` |  |
| `logstore_standard_log` | `contextid` | `context` | `id` |  |
| `logstore_standard_log` | `userid` | `user` | `id` |  |
| `logstore_standard_log` | `courseid` | `course` | `id` |  |
| `logstore_standard_log` | `realuserid` | `user` | `id` |  |
| `logstore_standard_log` | `relateduserid` | `user` | `id` |  |
| `lti_access_tokens` | `typeid` | `lti_types` | `id` |  |
| `lti_tool_settings` | `toolproxyid` | `lti_tool_proxies` | `id` |  |
| `lti_tool_settings` | `typeid` | `lti_types` | `id` |  |
| `lti_tool_settings` | `course` | `course` | `id` |  |
| `lti_tool_settings` | `coursemoduleid` | `lti` | `id` |  |
| `lti_types_categories` | `typeid` | `lti_types` | `id` |  |
| `lti_types_categories` | `categoryid` | `course_categories` | `id` |  |
| `ltiservice_gradebookservices` | `ltilinkid` | `lti` | `id` |  |
| `ltiservice_gradebookservices` | `gradeitemid`, `courseid` | `grade_items` | `id`, `courseid` |  |
| `matrix_room` | `commid` | `communication` | `id` |  |
| `message_airnotifier_devices` | `userdeviceid` | `user_devices` | `id` | yes |
| `message_contact_requests` | `userid` | `user` | `id` |  |
| `message_contact_requests` | `requesteduserid` | `user` | `id` |  |
| `message_contacts` | `userid` | `user` | `id` |  |
| `message_contacts` | `contactid` | `user` | `id` |  |
| `message_conversation_actions` | `userid` | `user` | `id` |  |
| `message_conversation_actions` | `conversationid` | `message_conversations` | `id` |  |
| `message_conversation_members` | `conversationid` | `message_conversations` | `id` |  |
| `message_conversation_members` | `userid` | `user` | `id` |  |
| `message_conversations` | `contextid` | `context` | `id` |  |
| `message_email_messages` | `useridto` | `user` | `id` |  |
| `message_email_messages` | `conversationid` | `message_conversations` | `id` |  |
| `message_email_messages` | `messageid` | `messages` | `id` |  |
| `message_popup_notifications` | `notificationid` | `notifications` | `id` |  |
| `message_user_actions` | `userid` | `user` | `id` |  |
| `message_user_actions` | `messageid` | `messages` | `id` |  |
| `message_users_blocked` | `userid` | `user` | `id` |  |
| `message_users_blocked` | `blockeduserid` | `user` | `id` |  |
| `messageinbound_datakeys` | `handler` | `messageinbound_handlers` | `id` |  |
| `messageinbound_messagelist` | `userid` | `user` | `id` |  |
| `messages` | `useridfrom` | `user` | `id` |  |
| `messages` | `conversationid` | `message_conversations` | `id` |  |
| `mnet_host` | `applicationid` | `mnet_application` | `id` |  |
| `mnet_session` | `userid` | `user` | `id` |  |
| `mnet_session` | `mnethostid` | `mnet_host` | `id` |  |
| `notifications` | `useridto` | `user` | `id` |  |
| `oauth2_access_token` | `issuerid` | `oauth2_issuer` | `id` | yes |
| `oauth2_access_token` | `usermodified` | `user` | `id` |  |
| `oauth2_endpoint` | `issuerid` | `oauth2_issuer` | `id` |  |
| `oauth2_endpoint` | `usermodified` | `user` | `id` |  |
| `oauth2_refresh_token` | `issuerid` | `oauth2_issuer` | `id` |  |
| `oauth2_refresh_token` | `userid` | `user` | `id` |  |
| `oauth2_system_account` | `issuerid` | `oauth2_issuer` | `id` | yes |
| `oauth2_system_account` | `usermodified` | `user` | `id` |  |
| `oauth2_user_field_mapping` | `issuerid` | `oauth2_issuer` | `id` |  |
| `oauth2_user_field_mapping` | `usermodified` | `user` | `id` |  |
| `paygw_paypal` | `paymentid` | `payments` | `id` | yes |
| `payment_accounts` | `contextid` | `context` | `id` |  |
| `payment_gateways` | `accountid` | `payment_accounts` | `id` |  |
| `payments` | `userid` | `user` | `id` |  |
| `payments` | `accountid` | `payment_accounts` | `id` |  |
| `portfolio_instance_config` | `instance` | `portfolio_instance` | `id` |  |
| `portfolio_instance_user` | `instance` | `portfolio_instance` | `id` |  |
| `portfolio_instance_user` | `userid` | `user` | `id` |  |
| `portfolio_log` | `userid` | `user` | `id` |  |
| `portfolio_log` | `portfolio` | `portfolio_instance` | `id` |  |
| `portfolio_log` | `tempdataid` | `portfolio_tempdata` | `id` |  |
| `portfolio_tempdata` | `userid` | `user` | `id` |  |
| `portfolio_tempdata` | `instance` | `portfolio_instance` | `id` |  |
| `post` | `usermodified` | `user` | `id` |  |
| `post` | `courseid` | `course` | `id` |  |
| `post` | `coursemoduleid` | `course_modules` | `id` |  |
| `qbank` | `course` | `course` | `id` |  |
| `qtype_ddimageortext` | `questionid` | `question` | `id` |  |
| `qtype_ddimageortext_drags` | `questionid` | `question` | `id` |  |
| `qtype_ddimageortext_drops` | `questionid` | `question` | `id` |  |
| `qtype_ddmarker` | `questionid` | `question` | `id` |  |
| `qtype_ddmarker_drags` | `questionid` | `question` | `id` |  |
| `qtype_ddmarker_drops` | `questionid` | `question` | `id` |  |
| `qtype_essay_options` | `questionid` | `question` | `id` | yes |
| `qtype_match_options` | `questionid` | `question` | `id` | yes |
| `qtype_match_subquestions` | `questionid` | `question` | `id` |  |
| `qtype_multichoice_options` | `questionid` | `question` | `id` | yes |
| `qtype_ordering_options` | `questionid` | `question` | `id` | yes |
| `qtype_randomsamatch_options` | `questionid` | `question` | `id` | yes |
| `qtype_shortanswer_options` | `questionid` | `question` | `id` | yes |
| `question` | `parent` | `question` | `id` |  |
| `question` | `createdby` | `user` | `id` |  |
| `question` | `modifiedby` | `user` | `id` |  |
| `question_answers` | `question` | `question` | `id` |  |
| `question_attempt_step_data` | `attemptstepid` | `question_attempt_steps` | `id` |  |
| `question_attempt_steps` | `questionattemptid` | `question_attempts` | `id` |  |
| `question_attempt_steps` | `userid` | `user` | `id` |  |
| `question_attempts` | `questionid` | `question` | `id` |  |
| `question_attempts` | `questionusageid` | `question_usages` | `id` |  |
| `question_bank_entries` | `questioncategoryid` | `question_categories` | `id` |  |
| `question_bank_entries` | `ownerid` | `user` | `id` |  |
| `question_calculated` | `question` | `question` | `id` |  |
| `question_calculated_options` | `question` | `question` | `id` |  |
| `question_categories` | `parent` | `question_categories` | `id` |  |
| `question_dataset_definitions` | `category` | `question_categories` | `id` |  |
| `question_datasets` | `question` | `question` | `id` |  |
| `question_datasets` | `datasetdefinition` | `question_dataset_definitions` | `id` |  |
| `question_ddwtos` | `questionid` | `question` | `id` |  |
| `question_gapselect` | `questionid` | `question` | `id` |  |
| `question_hints` | `questionid` | `question` | `id` |  |
| `question_multianswer` | `question` | `question` | `id` |  |
| `question_numerical` | `question` | `question` | `id` |  |
| `question_numerical_options` | `question` | `question` | `id` |  |
| `question_numerical_units` | `question` | `question` | `id` |  |
| `question_references` | `usingcontextid` | `context` | `id` |  |
| `question_references` | `questionbankentryid` | `question_bank_entries` | `id` |  |
| `question_response_analysis` | `questionid` | `question` | `id` |  |
| `question_response_count` | `analysisid` | `question_response_analysis` | `id` |  |
| `question_set_references` | `usingcontextid` | `context` | `id` |  |
| `question_set_references` | `questionscontextid` | `context` | `id` |  |
| `question_statistics` | `questionid` | `question` | `id` |  |
| `question_truefalse` | `question` | `question` | `id` |  |
| `question_usages` | `contextid` | `context` | `id` |  |
| `question_versions` | `questionbankentryid` | `question_bank_entries` | `id` |  |
| `question_versions` | `questionid` | `question` | `id` |  |
| `quiz_attempts` | `quiz` | `quiz` | `id` |  |
| `quiz_attempts` | `userid` | `user` | `id` |  |
| `quiz_attempts` | `uniqueid` | `question_usages` | `id` | yes |
| `quiz_feedback` | `quizid` | `quiz` | `id` |  |
| `quiz_grade_items` | `quizid` | `quiz` | `id` |  |
| `quiz_grades` | `quiz` | `quiz` | `id` |  |
| `quiz_overrides` | `quiz` | `quiz` | `id` |  |
| `quiz_overrides` | `groupid` | `groups` | `id` |  |
| `quiz_overrides` | `userid` | `user` | `id` |  |
| `quiz_overview_regrades` | `questionusageid`, `slot` | `question_attempts` | `questionusageid`, `slot` |  |
| `quiz_sections` | `quizid` | `quiz` | `id` |  |
| `quiz_slots` | `quizid` | `quiz` | `id` |  |
| `quiz_slots` | `quizgradeitemid` | `quiz_grade_items` | `id` |  |
| `quizaccess_seb_quizsettings` | `quizid` | `quiz` | `id` | yes |
| `quizaccess_seb_quizsettings` | `cmid` | `course_modules` | `id` | yes |
| `quizaccess_seb_quizsettings` | `templateid` | `quizaccess_seb_template` | `id` |  |
| `quizaccess_seb_quizsettings` | `usermodified` | `user` | `id` |  |
| `quizaccess_seb_template` | `usermodified` | `user` | `id` |  |
| `rating` | `contextid` | `context` | `id` |  |
| `rating` | `userid` | `user` | `id` |  |
| `rating` | `scaleid` | `scale` | `id` |  |
| `reportbuilder_audience` | `reportid` | `reportbuilder_report` | `id` |  |
| `reportbuilder_audience` | `usercreated` | `user` | `id` |  |
| `reportbuilder_audience` | `usermodified` | `user` | `id` |  |
| `reportbuilder_column` | `reportid` | `reportbuilder_report` | `id` |  |
| `reportbuilder_column` | `usercreated` | `user` | `id` |  |
| `reportbuilder_column` | `usermodified` | `user` | `id` |  |
| `reportbuilder_filter` | `reportid` | `reportbuilder_report` | `id` |  |
| `reportbuilder_filter` | `usercreated` | `user` | `id` |  |
| `reportbuilder_filter` | `usermodified` | `user` | `id` |  |
| `reportbuilder_report` | `usercreated` | `user` | `id` |  |
| `reportbuilder_report` | `usermodified` | `user` | `id` |  |
| `reportbuilder_report` | `contextid` | `context` | `id` |  |
| `reportbuilder_schedule` | `reportid` | `reportbuilder_report` | `id` |  |
| `reportbuilder_schedule` | `userviewas` | `user` | `id` |  |
| `reportbuilder_schedule` | `usercreated` | `user` | `id` |  |
| `reportbuilder_schedule` | `usermodified` | `user` | `id` |  |
| `reportbuilder_user_filter` | `reportid` | `reportbuilder_report` | `id` |  |
| `reportbuilder_user_filter` | `usercreated` | `user` | `id` |  |
| `reportbuilder_user_filter` | `usermodified` | `user` | `id` |  |
| `repository_instances` | `userid` | `user` | `id` |  |
| `repository_instances` | `contextid` | `context` | `id` |  |
| `repository_onedrive_access` | `usermodified` | `user` | `id` |  |
| `role_allow_assign` | `roleid` | `role` | `id` |  |
| `role_allow_assign` | `allowassign` | `role` | `id` |  |
| `role_allow_override` | `roleid` | `role` | `id` |  |
| `role_allow_override` | `allowoverride` | `role` | `id` |  |
| `role_allow_switch` | `roleid` | `role` | `id` |  |
| `role_allow_switch` | `allowswitch` | `role` | `id` |  |
| `role_allow_view` | `roleid` | `role` | `id` |  |
| `role_allow_view` | `allowview` | `role` | `id` |  |
| `role_assignments` | `roleid` | `role` | `id` |  |
| `role_assignments` | `contextid` | `context` | `id` |  |
| `role_assignments` | `userid` | `user` | `id` |  |
| `role_capabilities` | `roleid` | `role` | `id` |  |
| `role_capabilities` | `contextid` | `context` | `id` |  |
| `role_capabilities` | `modifierid` | `user` | `id` |  |
| `role_capabilities` | `capability` | `capabilities` | `name` |  |
| `role_context_levels` | `roleid` | `role` | `id` |  |
| `role_names` | `roleid` | `role` | `id` |  |
| `role_names` | `contextid` | `context` | `id` |  |
| `scale` | `userid` | `user` | `id` |  |
| `scale_history` | `oldid` | `scale` | `id` |  |
| `scale_history` | `courseid` | `course` | `id` |  |
| `scale_history` | `loggeduser` | `user` | `id` |  |
| `scale_history` | `userid` | `user` | `id` |  |
| `scorm_aicc_session` | `scormid` | `scorm` | `id` |  |
| `scorm_aicc_session` | `userid` | `user` | `id` |  |
| `scorm_attempt` | `userid` | `user` | `id` |  |
| `scorm_attempt` | `scormid` | `scorm` | `id` |  |
| `scorm_scoes` | `scorm` | `scorm` | `id` |  |
| `scorm_scoes_data` | `scoid` | `scorm_scoes` | `id` |  |
| `scorm_scoes_value` | `scoid` | `scorm_scoes` | `id` |  |
| `scorm_scoes_value` | `attemptid` | `scorm_attempt` | `id` |  |
| `scorm_scoes_value` | `elementid` | `scorm_element` | `id` |  |
| `scorm_seq_mapinfo` | `scoid` | `scorm_scoes` | `id` |  |
| `scorm_seq_mapinfo` | `objectiveid` | `scorm_seq_objective` | `id` |  |
| `scorm_seq_objective` | `scoid` | `scorm_scoes` | `id` |  |
| `scorm_seq_rolluprule` | `scoid` | `scorm_scoes` | `id` |  |
| `scorm_seq_rolluprulecond` | `scoid` | `scorm_scoes` | `id` |  |
| `scorm_seq_rolluprulecond` | `rollupruleid` | `scorm_seq_rolluprule` | `id` |  |
| `scorm_seq_rulecond` | `scoid` | `scorm_scoes` | `id` |  |
| `scorm_seq_rulecond` | `ruleconditionsid` | `scorm_seq_ruleconds` | `id` |  |
| `scorm_seq_ruleconds` | `scoid` | `scorm_scoes` | `id` |  |
| `search_index_requests` | `contextid` | `context` | `id` |  |
| `sessions` | `userid` | `user` | `id` |  |
| `shortlink` | `userid` | `user` | `id` |  |
| `sms_messages` | `gatewayid` | `sms_gateways` | `id` |  |
| `subsection` | `course` | `course` | `id` |  |
| `tag` | `userid` | `user` | `id` |  |
| `tag` | `tagcollid` | `tag_coll` | `id` |  |
| `tag_area` | `tagcollid` | `tag_coll` | `id` |  |
| `tag_correlation` | `tagid` | `tag` | `id` |  |
| `tag_instance` | `tagid` | `tag` | `id` |  |
| `tag_instance` | `contextid` | `context` | `id` |  |
| `task_adhoc` | `userid` | `user` | `id` |  |
| `task_log` | `userid` | `user` | `id` |  |
| `tool_brickfield_areas` | `courseid` | `course` | `id` |  |
| `tool_brickfield_areas` | `cmid` | `course_modules` | `id` |  |
| `tool_brickfield_areas` | `categoryid` | `course_categories` | `id` |  |
| `tool_brickfield_areas` | `contextid` | `context` | `id` |  |
| `tool_brickfield_cache_acts` | `courseid` | `course` | `id` |  |
| `tool_brickfield_cache_check` | `courseid` | `course` | `id` |  |
| `tool_brickfield_content` | `areaid` | `tool_brickfield_areas` | `id` |  |
| `tool_brickfield_errors` | `resultid` | `tool_brickfield_results` | `id` |  |
| `tool_brickfield_results` | `contentid` | `tool_brickfield_content` | `id` |  |
| `tool_brickfield_results` | `checkid` | `tool_brickfield_checks` | `id` |  |
| `tool_brickfield_summary` | `courseid` | `course` | `id` |  |
| `tool_customlang` | `componentid` | `tool_customlang_components` | `id` |  |
| `tool_dataprivacy_ctxexpired` | `contextid` | `context` | `id` | yes |
| `tool_dataprivacy_ctxinstance` | `contextid` | `context` | `id` | yes |
| `tool_dataprivacy_ctxinstance` | `purposeid` | `tool_dataprivacy_purpose` | `id` |  |
| `tool_dataprivacy_ctxinstance` | `categoryid` | `tool_dataprivacy_category` | `id` |  |
| `tool_dataprivacy_ctxlevel` | `categoryid` | `tool_dataprivacy_category` | `id` |  |
| `tool_dataprivacy_ctxlevel` | `purposeid` | `tool_dataprivacy_purpose` | `id` |  |
| `tool_dataprivacy_ctxlst_ctx` | `contextlistid` | `tool_dataprivacy_contextlist` | `id` |  |
| `tool_dataprivacy_purposerole` | `purposeid` | `tool_dataprivacy_purpose` | `id` |  |
| `tool_dataprivacy_purposerole` | `roleid` | `role` | `id` |  |
| `tool_dataprivacy_purposerole` | `usermodified` | `user` | `id` |  |
| `tool_dataprivacy_request` | `userid` | `user` | `id` |  |
| `tool_dataprivacy_request` | `requestedby` | `user` | `id` |  |
| `tool_dataprivacy_request` | `dpo` | `user` | `id` |  |
| `tool_dataprivacy_request` | `usermodified` | `user` | `id` |  |
| `tool_dataprivacy_rqst_ctxlst` | `requestid` | `tool_dataprivacy_request` | `id` |  |
| `tool_dataprivacy_rqst_ctxlst` | `contextlistid` | `tool_dataprivacy_contextlist` | `id` |  |
| `tool_mfa_auth` | `userid` | `user` | `id` |  |
| `tool_mfa_secrets` | `userid` | `user` | `id` |  |
| `tool_monitor_events` | `courseid` | `course` | `id` |  |
| `tool_monitor_events` | `contextid` | `context` | `id` |  |
| `tool_monitor_events` | `contextinstanceid` | `context` | `instanceid` |  |
| `tool_monitor_history` | `sid` | `tool_monitor_subscriptions` | `id` |  |
| `tool_monitor_subscriptions` | `ruleid` | `tool_monitor_rules` | `id` |  |
| `tool_policy` | `currentversionid` | `tool_policy_versions` | `id` |  |
| `tool_policy_acceptances` | `policyversionid` | `tool_policy_versions` | `id` |  |
| `tool_policy_acceptances` | `userid` | `user` | `id` |  |
| `tool_policy_acceptances` | `usermodified` | `user` | `id` |  |
| `tool_policy_versions` | `usermodified` | `user` | `id` |  |
| `tool_policy_versions` | `policyid` | `tool_policy` | `id` |  |
| `tool_recyclebin_category` | `categoryid` | `course_categories` | `id` |  |
| `tool_recyclebin_course` | `courseid` | `course` | `id` |  |
| `tool_usertours_steps` | `tourid` | `tool_usertours_tours` | `id` |  |
| `upgrade_log` | `userid` | `user` | `id` |  |
| `user_devices` | `userid` | `user` | `id` |  |
| `user_enrolments` | `enrolid` | `enrol` | `id` |  |
| `user_enrolments` | `userid` | `user` | `id` |  |
| `user_enrolments` | `modifierid` | `user` | `id` |  |
| `user_password_history` | `userid` | `user` | `id` |  |
| `user_password_resets` | `userid` | `user` | `id` |  |
| `user_private_key` | `userid` | `user` | `id` |  |
| `wiki_links` | `frompageid` | `wiki_pages` | `id` |  |
| `wiki_links` | `subwikiid` | `wiki_subwikis` | `id` |  |
| `wiki_pages` | `subwikiid` | `wiki_subwikis` | `id` |  |
| `wiki_subwikis` | `wikiid` | `wiki` | `id` |  |
| `wiki_versions` | `pageid` | `wiki_pages` | `id` |  |
| `workshop` | `course` | `course` | `id` |  |
| `workshop_aggregations` | `workshopid` | `workshop` | `id` |  |
| `workshop_aggregations` | `userid` | `user` | `id` |  |
| `workshop_assessments` | `submissionid` | `workshop_submissions` | `id` |  |
| `workshop_assessments` | `gradinggradeoverby` | `user` | `id` |  |
| `workshop_assessments` | `reviewerid` | `user` | `id` |  |
| `workshop_grades` | `assessmentid` | `workshop_assessments` | `id` |  |
| `workshop_submissions` | `workshopid` | `workshop` | `id` |  |
| `workshop_submissions` | `gradeoverby` | `user` | `id` |  |
| `workshop_submissions` | `authorid` | `user` | `id` |  |
| `workshopallocation_scheduled` | `workshopid` | `workshop` | `id` | yes |
| `workshopeval_best_settings` | `workshopid` | `workshop` | `id` | yes |
| `workshopform_accumulative` | `workshopid` | `workshop` | `id` |  |
| `workshopform_comments` | `workshopid` | `workshop` | `id` |  |
| `workshopform_numerrors` | `workshopid` | `workshop` | `id` |  |
| `workshopform_numerrors_map` | `workshopid` | `workshop` | `id` |  |
| `workshopform_rubric` | `workshopid` | `workshop` | `id` |  |
| `workshopform_rubric_levels` | `dimensionid` | `workshopform_rubric` | `id` |  |

## Tables by Component

<details><summary><b>admin/tool/brickfield</b> (10 tables)</summary>

[`tool_brickfield_areas`](#tool_brickfield_areas), [`tool_brickfield_cache_acts`](#tool_brickfield_cache_acts), [`tool_brickfield_cache_check`](#tool_brickfield_cache_check), [`tool_brickfield_checks`](#tool_brickfield_checks), [`tool_brickfield_content`](#tool_brickfield_content), [`tool_brickfield_errors`](#tool_brickfield_errors), [`tool_brickfield_process`](#tool_brickfield_process), [`tool_brickfield_results`](#tool_brickfield_results), [`tool_brickfield_schedule`](#tool_brickfield_schedule), [`tool_brickfield_summary`](#tool_brickfield_summary)

</details>

<details><summary><b>admin/tool/cohortroles</b> (1 tables)</summary>

[`tool_cohortroles`](#tool_cohortroles)

</details>

<details><summary><b>admin/tool/customlang</b> (2 tables)</summary>

[`tool_customlang`](#tool_customlang), [`tool_customlang_components`](#tool_customlang_components)

</details>

<details><summary><b>admin/tool/dataprivacy</b> (10 tables)</summary>

[`tool_dataprivacy_category`](#tool_dataprivacy_category), [`tool_dataprivacy_contextlist`](#tool_dataprivacy_contextlist), [`tool_dataprivacy_ctxexpired`](#tool_dataprivacy_ctxexpired), [`tool_dataprivacy_ctxinstance`](#tool_dataprivacy_ctxinstance), [`tool_dataprivacy_ctxlevel`](#tool_dataprivacy_ctxlevel), [`tool_dataprivacy_ctxlst_ctx`](#tool_dataprivacy_ctxlst_ctx), [`tool_dataprivacy_purpose`](#tool_dataprivacy_purpose), [`tool_dataprivacy_purposerole`](#tool_dataprivacy_purposerole), [`tool_dataprivacy_request`](#tool_dataprivacy_request), [`tool_dataprivacy_rqst_ctxlst`](#tool_dataprivacy_rqst_ctxlst)

</details>

<details><summary><b>admin/tool/log/store/standard</b> (1 tables)</summary>

[`logstore_standard_log`](#logstore_standard_log)

</details>

<details><summary><b>admin/tool/mfa</b> (3 tables)</summary>

[`tool_mfa`](#tool_mfa), [`tool_mfa_auth`](#tool_mfa_auth), [`tool_mfa_secrets`](#tool_mfa_secrets)

</details>

<details><summary><b>admin/tool/monitor</b> (4 tables)</summary>

[`tool_monitor_events`](#tool_monitor_events), [`tool_monitor_history`](#tool_monitor_history), [`tool_monitor_rules`](#tool_monitor_rules), [`tool_monitor_subscriptions`](#tool_monitor_subscriptions)

</details>

<details><summary><b>admin/tool/policy</b> (3 tables)</summary>

[`tool_policy`](#tool_policy), [`tool_policy_acceptances`](#tool_policy_acceptances), [`tool_policy_versions`](#tool_policy_versions)

</details>

<details><summary><b>admin/tool/recyclebin</b> (2 tables)</summary>

[`tool_recyclebin_category`](#tool_recyclebin_category), [`tool_recyclebin_course`](#tool_recyclebin_course)

</details>

<details><summary><b>admin/tool/usertours</b> (2 tables)</summary>

[`tool_usertours_steps`](#tool_usertours_steps), [`tool_usertours_tours`](#tool_usertours_tours)

</details>

<details><summary><b>auth/lti</b> (1 tables)</summary>

[`auth_lti_linked_login`](#auth_lti_linked_login)

</details>

<details><summary><b>auth/oauth2</b> (1 tables)</summary>

[`auth_oauth2_linked_login`](#auth_oauth2_linked_login)

</details>

<details><summary><b>blocks/recent_activity</b> (1 tables)</summary>

[`block_recent_activity`](#block_recent_activity)

</details>

<details><summary><b>blocks/recentlyaccesseditems</b> (1 tables)</summary>

[`block_recentlyaccesseditems`](#block_recentlyaccesseditems)

</details>

<details><summary><b>blocks/rss_client</b> (1 tables)</summary>

[`block_rss_client`](#block_rss_client)

</details>

<details><summary><b>communication/provider/customlink</b> (1 tables)</summary>

[`communication_customlink`](#communication_customlink)

</details>

<details><summary><b>communication/provider/matrix</b> (1 tables)</summary>

[`matrix_room`](#matrix_room)

</details>

<details><summary><b>core (lib)</b> (258 tables)</summary>

[`adminpresets`](#adminpresets), [`adminpresets_app`](#adminpresets_app), [`adminpresets_app_it`](#adminpresets_app_it), [`adminpresets_app_it_a`](#adminpresets_app_it_a), [`adminpresets_app_plug`](#adminpresets_app_plug), [`adminpresets_it`](#adminpresets_it), [`adminpresets_it_a`](#adminpresets_it_a), [`adminpresets_plug`](#adminpresets_plug), [`ai_action_explain_text`](#ai_action_explain_text), [`ai_action_generate_image`](#ai_action_generate_image), [`ai_action_generate_text`](#ai_action_generate_text), [`ai_action_register`](#ai_action_register), [`ai_action_summarise_text`](#ai_action_summarise_text), [`ai_policy_register`](#ai_policy_register), [`ai_providers`](#ai_providers), [`analytics_indicator_calc`](#analytics_indicator_calc), [`analytics_models`](#analytics_models), [`analytics_models_log`](#analytics_models_log), [`analytics_predict_samples`](#analytics_predict_samples), [`analytics_prediction_actions`](#analytics_prediction_actions), [`analytics_predictions`](#analytics_predictions), [`analytics_train_samples`](#analytics_train_samples), [`analytics_used_analysables`](#analytics_used_analysables), [`analytics_used_files`](#analytics_used_files), [`backup_controllers`](#backup_controllers), [`backup_courses`](#backup_courses), [`backup_logs`](#backup_logs), [`badge`](#badge), [`badge_alignment`](#badge_alignment), [`badge_backpack`](#badge_backpack), [`badge_backpack_oauth2`](#badge_backpack_oauth2), [`badge_criteria`](#badge_criteria), [`badge_criteria_met`](#badge_criteria_met), [`badge_criteria_param`](#badge_criteria_param), [`badge_endorsement`](#badge_endorsement), [`badge_external`](#badge_external), [`badge_external_backpack`](#badge_external_backpack), [`badge_external_identifier`](#badge_external_identifier), [`badge_issued`](#badge_issued), [`badge_manual_award`](#badge_manual_award), [`badge_related`](#badge_related), [`block`](#block), [`block_instances`](#block_instances), [`block_positions`](#block_positions), [`blog_association`](#blog_association), [`blog_external`](#blog_external), [`cache_filters`](#cache_filters), [`cache_flags`](#cache_flags), [`capabilities`](#capabilities), [`cohort`](#cohort), [`cohort_members`](#cohort_members), [`comments`](#comments), [`communication`](#communication), [`communication_user`](#communication_user), [`competency`](#competency), [`competency_coursecomp`](#competency_coursecomp), [`competency_coursecompsetting`](#competency_coursecompsetting), [`competency_evidence`](#competency_evidence), [`competency_framework`](#competency_framework), [`competency_modulecomp`](#competency_modulecomp), [`competency_plan`](#competency_plan), [`competency_plancomp`](#competency_plancomp), [`competency_relatedcomp`](#competency_relatedcomp), [`competency_template`](#competency_template), [`competency_templatecohort`](#competency_templatecohort), [`competency_templatecomp`](#competency_templatecomp), [`competency_usercomp`](#competency_usercomp), [`competency_usercompcourse`](#competency_usercompcourse), [`competency_usercompplan`](#competency_usercompplan), [`competency_userevidence`](#competency_userevidence), [`competency_userevidencecomp`](#competency_userevidencecomp), [`config`](#config), [`config_log`](#config_log), [`config_plugins`](#config_plugins), [`contentbank_content`](#contentbank_content), [`context`](#context), [`context_temp`](#context_temp), [`course`](#course), [`course_categories`](#course_categories), [`course_completion_aggr_methd`](#course_completion_aggr_methd), [`course_completion_crit_compl`](#course_completion_crit_compl), [`course_completion_criteria`](#course_completion_criteria), [`course_completion_defaults`](#course_completion_defaults), [`course_completions`](#course_completions), [`course_format_options`](#course_format_options), [`course_modules`](#course_modules), [`course_modules_completion`](#course_modules_completion), [`course_modules_viewed`](#course_modules_viewed), [`course_published`](#course_published), [`course_request`](#course_request), [`course_sections`](#course_sections), [`customfield_category`](#customfield_category), [`customfield_data`](#customfield_data), [`customfield_field`](#customfield_field), [`customfield_shared`](#customfield_shared), [`enrol`](#enrol), [`event`](#event), [`event_subscriptions`](#event_subscriptions), [`events_handlers`](#events_handlers), [`events_queue`](#events_queue), [`events_queue_handlers`](#events_queue_handlers), [`external_functions`](#external_functions), [`external_services`](#external_services), [`external_services_functions`](#external_services_functions), [`external_services_users`](#external_services_users), [`external_tokens`](#external_tokens), [`favourite`](#favourite), [`file_conversion`](#file_conversion), [`files`](#files), [`files_reference`](#files_reference), [`filter_active`](#filter_active), [`filter_config`](#filter_config), [`grade_categories`](#grade_categories), [`grade_categories_history`](#grade_categories_history), [`grade_grades`](#grade_grades), [`grade_grades_history`](#grade_grades_history), [`grade_import_newitem`](#grade_import_newitem), [`grade_import_values`](#grade_import_values), [`grade_items`](#grade_items), [`grade_items_history`](#grade_items_history), [`grade_letters`](#grade_letters), [`grade_outcomes`](#grade_outcomes), [`grade_outcomes_courses`](#grade_outcomes_courses), [`grade_outcomes_history`](#grade_outcomes_history), [`grade_settings`](#grade_settings), [`grading_areas`](#grading_areas), [`grading_definitions`](#grading_definitions), [`grading_instances`](#grading_instances), [`groupings`](#groupings), [`groupings_groups`](#groupings_groups), [`groups`](#groups), [`groups_members`](#groups_members), [`h5p`](#h5p), [`h5p_contents_libraries`](#h5p_contents_libraries), [`h5p_libraries`](#h5p_libraries), [`h5p_libraries_cachedassets`](#h5p_libraries_cachedassets), [`h5p_library_dependencies`](#h5p_library_dependencies), [`infected_files`](#infected_files), [`license`](#license), [`lock_db`](#lock_db), [`log`](#log), [`log_display`](#log_display), [`log_queries`](#log_queries), [`message`](#message), [`message_contact_requests`](#message_contact_requests), [`message_contacts`](#message_contacts), [`message_conversation_actions`](#message_conversation_actions), [`message_conversation_members`](#message_conversation_members), [`message_conversations`](#message_conversations), [`message_processors`](#message_processors), [`message_providers`](#message_providers), [`message_read`](#message_read), [`message_user_actions`](#message_user_actions), [`message_users_blocked`](#message_users_blocked), [`messageinbound_datakeys`](#messageinbound_datakeys), [`messageinbound_handlers`](#messageinbound_handlers), [`messageinbound_messagelist`](#messageinbound_messagelist), [`messages`](#messages), [`mnet_application`](#mnet_application), [`mnet_host`](#mnet_host), [`mnet_host2service`](#mnet_host2service), [`mnet_log`](#mnet_log), [`mnet_remote_rpc`](#mnet_remote_rpc), [`mnet_remote_service2rpc`](#mnet_remote_service2rpc), [`mnet_rpc`](#mnet_rpc), [`mnet_service`](#mnet_service), [`mnet_service2rpc`](#mnet_service2rpc), [`mnet_session`](#mnet_session), [`mnet_sso_access_control`](#mnet_sso_access_control), [`modules`](#modules), [`my_pages`](#my_pages), [`notifications`](#notifications), [`oauth2_access_token`](#oauth2_access_token), [`oauth2_endpoint`](#oauth2_endpoint), [`oauth2_issuer`](#oauth2_issuer), [`oauth2_refresh_token`](#oauth2_refresh_token), [`oauth2_system_account`](#oauth2_system_account), [`oauth2_user_field_mapping`](#oauth2_user_field_mapping), [`payment_accounts`](#payment_accounts), [`payment_gateways`](#payment_gateways), [`payments`](#payments), [`portfolio_instance`](#portfolio_instance), [`portfolio_instance_config`](#portfolio_instance_config), [`portfolio_instance_user`](#portfolio_instance_user), [`portfolio_log`](#portfolio_log), [`portfolio_tempdata`](#portfolio_tempdata), [`post`](#post), [`profiling`](#profiling), [`question`](#question), [`question_answers`](#question_answers), [`question_attempt_step_data`](#question_attempt_step_data), [`question_attempt_steps`](#question_attempt_steps), [`question_attempts`](#question_attempts), [`question_bank_entries`](#question_bank_entries), [`question_categories`](#question_categories), [`question_hints`](#question_hints), [`question_references`](#question_references), [`question_response_analysis`](#question_response_analysis), [`question_response_count`](#question_response_count), [`question_set_references`](#question_set_references), [`question_statistics`](#question_statistics), [`question_usages`](#question_usages), [`question_versions`](#question_versions), [`rating`](#rating), [`registration_hubs`](#registration_hubs), [`reportbuilder_audience`](#reportbuilder_audience), [`reportbuilder_column`](#reportbuilder_column), [`reportbuilder_filter`](#reportbuilder_filter), [`reportbuilder_report`](#reportbuilder_report), [`reportbuilder_schedule`](#reportbuilder_schedule), [`reportbuilder_user_filter`](#reportbuilder_user_filter), [`repository`](#repository), [`repository_instance_config`](#repository_instance_config), [`repository_instances`](#repository_instances), [`role`](#role), [`role_allow_assign`](#role_allow_assign), [`role_allow_override`](#role_allow_override), [`role_allow_switch`](#role_allow_switch), [`role_allow_view`](#role_allow_view), [`role_assignments`](#role_assignments), [`role_capabilities`](#role_capabilities), [`role_context_levels`](#role_context_levels), [`role_names`](#role_names), [`scale`](#scale), [`scale_history`](#scale_history), [`search_index_requests`](#search_index_requests), [`sessions`](#sessions), [`shortlink`](#shortlink), [`sms_gateways`](#sms_gateways), [`sms_messages`](#sms_messages), [`stats_daily`](#stats_daily), [`stats_monthly`](#stats_monthly), [`stats_user_daily`](#stats_user_daily), [`stats_user_monthly`](#stats_user_monthly), [`stats_user_weekly`](#stats_user_weekly), [`stats_weekly`](#stats_weekly), [`stored_progress`](#stored_progress), [`tag`](#tag), [`tag_area`](#tag_area), [`tag_coll`](#tag_coll), [`tag_correlation`](#tag_correlation), [`tag_instance`](#tag_instance), [`task_adhoc`](#task_adhoc), [`task_log`](#task_log), [`task_scheduled`](#task_scheduled), [`upgrade_log`](#upgrade_log), [`user`](#user), [`user_devices`](#user_devices), [`user_enrolments`](#user_enrolments), [`user_info_category`](#user_info_category), [`user_info_data`](#user_info_data), [`user_info_field`](#user_info_field), [`user_lastaccess`](#user_lastaccess), [`user_password_history`](#user_password_history), [`user_password_resets`](#user_password_resets), [`user_preferences`](#user_preferences), [`user_private_key`](#user_private_key), [`xapi_states`](#xapi_states)

</details>

<details><summary><b>enrol/flatfile</b> (1 tables)</summary>

[`enrol_flatfile`](#enrol_flatfile)

</details>

<details><summary><b>enrol/lti</b> (15 tables)</summary>

[`enrol_lti_app_registration`](#enrol_lti_app_registration), [`enrol_lti_context`](#enrol_lti_context), [`enrol_lti_deployment`](#enrol_lti_deployment), [`enrol_lti_lti2_consumer`](#enrol_lti_lti2_consumer), [`enrol_lti_lti2_context`](#enrol_lti_lti2_context), [`enrol_lti_lti2_nonce`](#enrol_lti_lti2_nonce), [`enrol_lti_lti2_resource_link`](#enrol_lti_lti2_resource_link), [`enrol_lti_lti2_share_key`](#enrol_lti_lti2_share_key), [`enrol_lti_lti2_tool_proxy`](#enrol_lti_lti2_tool_proxy), [`enrol_lti_lti2_user_result`](#enrol_lti_lti2_user_result), [`enrol_lti_resource_link`](#enrol_lti_resource_link), [`enrol_lti_tool_consumer_map`](#enrol_lti_tool_consumer_map), [`enrol_lti_tools`](#enrol_lti_tools), [`enrol_lti_user_resource_link`](#enrol_lti_user_resource_link), [`enrol_lti_users`](#enrol_lti_users)

</details>

<details><summary><b>enrol/paypal</b> (1 tables)</summary>

[`enrol_paypal`](#enrol_paypal)

</details>

<details><summary><b>grade/grading/form/guide</b> (3 tables)</summary>

[`gradingform_guide_comments`](#gradingform_guide_comments), [`gradingform_guide_criteria`](#gradingform_guide_criteria), [`gradingform_guide_fillings`](#gradingform_guide_fillings)

</details>

<details><summary><b>grade/grading/form/rubric</b> (3 tables)</summary>

[`gradingform_rubric_criteria`](#gradingform_rubric_criteria), [`gradingform_rubric_fillings`](#gradingform_rubric_fillings), [`gradingform_rubric_levels`](#gradingform_rubric_levels)

</details>

<details><summary><b>grade/penalty/duedate</b> (1 tables)</summary>

[`gradepenalty_duedate_rule`](#gradepenalty_duedate_rule)

</details>

<details><summary><b>lib/editor/tiny/plugins/autosave</b> (1 tables)</summary>

[`tiny_autosave`](#tiny_autosave)

</details>

<details><summary><b>message/output/airnotifier</b> (1 tables)</summary>

[`message_airnotifier_devices`](#message_airnotifier_devices)

</details>

<details><summary><b>message/output/email</b> (1 tables)</summary>

[`message_email_messages`](#message_email_messages)

</details>

<details><summary><b>message/output/popup</b> (2 tables)</summary>

[`message_popup`](#message_popup), [`message_popup_notifications`](#message_popup_notifications)

</details>

<details><summary><b>mod/assign</b> (9 tables)</summary>

[`assign`](#assign), [`assign_allocated_marker`](#assign_allocated_marker), [`assign_grades`](#assign_grades), [`assign_mark`](#assign_mark), [`assign_overrides`](#assign_overrides), [`assign_plugin_config`](#assign_plugin_config), [`assign_submission`](#assign_submission), [`assign_user_flags`](#assign_user_flags), [`assign_user_mapping`](#assign_user_mapping)

</details>

<details><summary><b>mod/assign/feedback/comments</b> (1 tables)</summary>

[`assignfeedback_comments`](#assignfeedback_comments)

</details>

<details><summary><b>mod/assign/feedback/editpdf</b> (4 tables)</summary>

[`assignfeedback_editpdf_annot`](#assignfeedback_editpdf_annot), [`assignfeedback_editpdf_cmnt`](#assignfeedback_editpdf_cmnt), [`assignfeedback_editpdf_quick`](#assignfeedback_editpdf_quick), [`assignfeedback_editpdf_rot`](#assignfeedback_editpdf_rot)

</details>

<details><summary><b>mod/assign/feedback/file</b> (1 tables)</summary>

[`assignfeedback_file`](#assignfeedback_file)

</details>

<details><summary><b>mod/assign/submission/file</b> (1 tables)</summary>

[`assignsubmission_file`](#assignsubmission_file)

</details>

<details><summary><b>mod/assign/submission/onlinetext</b> (1 tables)</summary>

[`assignsubmission_onlinetext`](#assignsubmission_onlinetext)

</details>

<details><summary><b>mod/bigbluebuttonbn</b> (3 tables)</summary>

[`bigbluebuttonbn`](#bigbluebuttonbn), [`bigbluebuttonbn_logs`](#bigbluebuttonbn_logs), [`bigbluebuttonbn_recordings`](#bigbluebuttonbn_recordings)

</details>

<details><summary><b>mod/book</b> (2 tables)</summary>

[`book`](#book), [`book_chapters`](#book_chapters)

</details>

<details><summary><b>mod/choice</b> (3 tables)</summary>

[`choice`](#choice), [`choice_answers`](#choice_answers), [`choice_options`](#choice_options)

</details>

<details><summary><b>mod/data</b> (4 tables)</summary>

[`data`](#data), [`data_content`](#data_content), [`data_fields`](#data_fields), [`data_records`](#data_records)

</details>

<details><summary><b>mod/feedback</b> (8 tables)</summary>

[`feedback`](#feedback), [`feedback_completed`](#feedback_completed), [`feedback_completedtmp`](#feedback_completedtmp), [`feedback_item`](#feedback_item), [`feedback_sitecourse_map`](#feedback_sitecourse_map), [`feedback_template`](#feedback_template), [`feedback_value`](#feedback_value), [`feedback_valuetmp`](#feedback_valuetmp)

</details>

<details><summary><b>mod/folder</b> (1 tables)</summary>

[`folder`](#folder)

</details>

<details><summary><b>mod/forum</b> (10 tables)</summary>

[`forum`](#forum), [`forum_digests`](#forum_digests), [`forum_discussion_subs`](#forum_discussion_subs), [`forum_discussions`](#forum_discussions), [`forum_grades`](#forum_grades), [`forum_posts`](#forum_posts), [`forum_queue`](#forum_queue), [`forum_read`](#forum_read), [`forum_subscriptions`](#forum_subscriptions), [`forum_track_prefs`](#forum_track_prefs)

</details>

<details><summary><b>mod/glossary</b> (6 tables)</summary>

[`glossary`](#glossary), [`glossary_alias`](#glossary_alias), [`glossary_categories`](#glossary_categories), [`glossary_entries`](#glossary_entries), [`glossary_entries_categories`](#glossary_entries_categories), [`glossary_formats`](#glossary_formats)

</details>

<details><summary><b>mod/h5pactivity</b> (3 tables)</summary>

[`h5pactivity`](#h5pactivity), [`h5pactivity_attempts`](#h5pactivity_attempts), [`h5pactivity_attempts_results`](#h5pactivity_attempts_results)

</details>

<details><summary><b>mod/imscp</b> (1 tables)</summary>

[`imscp`](#imscp)

</details>

<details><summary><b>mod/label</b> (1 tables)</summary>

[`label`](#label)

</details>

<details><summary><b>mod/lesson</b> (8 tables)</summary>

[`lesson`](#lesson), [`lesson_answers`](#lesson_answers), [`lesson_attempts`](#lesson_attempts), [`lesson_branch`](#lesson_branch), [`lesson_grades`](#lesson_grades), [`lesson_overrides`](#lesson_overrides), [`lesson_pages`](#lesson_pages), [`lesson_timer`](#lesson_timer)

</details>

<details><summary><b>mod/lti</b> (9 tables)</summary>

[`lti`](#lti), [`lti_access_tokens`](#lti_access_tokens), [`lti_coursevisible`](#lti_coursevisible), [`lti_submission`](#lti_submission), [`lti_tool_proxies`](#lti_tool_proxies), [`lti_tool_settings`](#lti_tool_settings), [`lti_types`](#lti_types), [`lti_types_categories`](#lti_types_categories), [`lti_types_config`](#lti_types_config)

</details>

<details><summary><b>mod/lti/service/gradebookservices</b> (1 tables)</summary>

[`ltiservice_gradebookservices`](#ltiservice_gradebookservices)

</details>

<details><summary><b>mod/page</b> (1 tables)</summary>

[`page`](#page)

</details>

<details><summary><b>mod/qbank</b> (1 tables)</summary>

[`qbank`](#qbank)

</details>

<details><summary><b>mod/quiz</b> (9 tables)</summary>

[`quiz`](#quiz), [`quiz_attempts`](#quiz_attempts), [`quiz_feedback`](#quiz_feedback), [`quiz_grade_items`](#quiz_grade_items), [`quiz_grades`](#quiz_grades), [`quiz_overrides`](#quiz_overrides), [`quiz_reports`](#quiz_reports), [`quiz_sections`](#quiz_sections), [`quiz_slots`](#quiz_slots)

</details>

<details><summary><b>mod/quiz/accessrule/seb</b> (2 tables)</summary>

[`quizaccess_seb_quizsettings`](#quizaccess_seb_quizsettings), [`quizaccess_seb_template`](#quizaccess_seb_template)

</details>

<details><summary><b>mod/quiz/report/overview</b> (1 tables)</summary>

[`quiz_overview_regrades`](#quiz_overview_regrades)

</details>

<details><summary><b>mod/quiz/report/statistics</b> (1 tables)</summary>

[`quiz_statistics`](#quiz_statistics)

</details>

<details><summary><b>mod/resource</b> (2 tables)</summary>

[`resource`](#resource), [`resource_old`](#resource_old)

</details>

<details><summary><b>mod/scorm</b> (13 tables)</summary>

[`scorm`](#scorm), [`scorm_aicc_session`](#scorm_aicc_session), [`scorm_attempt`](#scorm_attempt), [`scorm_element`](#scorm_element), [`scorm_scoes`](#scorm_scoes), [`scorm_scoes_data`](#scorm_scoes_data), [`scorm_scoes_value`](#scorm_scoes_value), [`scorm_seq_mapinfo`](#scorm_seq_mapinfo), [`scorm_seq_objective`](#scorm_seq_objective), [`scorm_seq_rolluprule`](#scorm_seq_rolluprule), [`scorm_seq_rolluprulecond`](#scorm_seq_rolluprulecond), [`scorm_seq_rulecond`](#scorm_seq_rulecond), [`scorm_seq_ruleconds`](#scorm_seq_ruleconds)

</details>

<details><summary><b>mod/subsection</b> (1 tables)</summary>

[`subsection`](#subsection)

</details>

<details><summary><b>mod/url</b> (1 tables)</summary>

[`url`](#url)

</details>

<details><summary><b>mod/wiki</b> (7 tables)</summary>

[`wiki`](#wiki), [`wiki_links`](#wiki_links), [`wiki_locks`](#wiki_locks), [`wiki_pages`](#wiki_pages), [`wiki_subwikis`](#wiki_subwikis), [`wiki_synonyms`](#wiki_synonyms), [`wiki_versions`](#wiki_versions)

</details>

<details><summary><b>mod/workshop</b> (5 tables)</summary>

[`workshop`](#workshop), [`workshop_aggregations`](#workshop_aggregations), [`workshop_assessments`](#workshop_assessments), [`workshop_grades`](#workshop_grades), [`workshop_submissions`](#workshop_submissions)

</details>

<details><summary><b>mod/workshop/allocation/scheduled</b> (1 tables)</summary>

[`workshopallocation_scheduled`](#workshopallocation_scheduled)

</details>

<details><summary><b>mod/workshop/eval/best</b> (1 tables)</summary>

[`workshopeval_best_settings`](#workshopeval_best_settings)

</details>

<details><summary><b>mod/workshop/form/accumulative</b> (1 tables)</summary>

[`workshopform_accumulative`](#workshopform_accumulative)

</details>

<details><summary><b>mod/workshop/form/comments</b> (1 tables)</summary>

[`workshopform_comments`](#workshopform_comments)

</details>

<details><summary><b>mod/workshop/form/numerrors</b> (2 tables)</summary>

[`workshopform_numerrors`](#workshopform_numerrors), [`workshopform_numerrors_map`](#workshopform_numerrors_map)

</details>

<details><summary><b>mod/workshop/form/rubric</b> (3 tables)</summary>

[`workshopform_rubric`](#workshopform_rubric), [`workshopform_rubric_config`](#workshopform_rubric_config), [`workshopform_rubric_levels`](#workshopform_rubric_levels)

</details>

<details><summary><b>payment/gateway/paypal</b> (1 tables)</summary>

[`paygw_paypal`](#paygw_paypal)

</details>

<details><summary><b>question/type/calculated</b> (5 tables)</summary>

[`question_calculated`](#question_calculated), [`question_calculated_options`](#question_calculated_options), [`question_dataset_definitions`](#question_dataset_definitions), [`question_dataset_items`](#question_dataset_items), [`question_datasets`](#question_datasets)

</details>

<details><summary><b>question/type/ddimageortext</b> (3 tables)</summary>

[`qtype_ddimageortext`](#qtype_ddimageortext), [`qtype_ddimageortext_drags`](#qtype_ddimageortext_drags), [`qtype_ddimageortext_drops`](#qtype_ddimageortext_drops)

</details>

<details><summary><b>question/type/ddmarker</b> (3 tables)</summary>

[`qtype_ddmarker`](#qtype_ddmarker), [`qtype_ddmarker_drags`](#qtype_ddmarker_drags), [`qtype_ddmarker_drops`](#qtype_ddmarker_drops)

</details>

<details><summary><b>question/type/ddwtos</b> (1 tables)</summary>

[`question_ddwtos`](#question_ddwtos)

</details>

<details><summary><b>question/type/essay</b> (1 tables)</summary>

[`qtype_essay_options`](#qtype_essay_options)

</details>

<details><summary><b>question/type/gapselect</b> (1 tables)</summary>

[`question_gapselect`](#question_gapselect)

</details>

<details><summary><b>question/type/match</b> (2 tables)</summary>

[`qtype_match_options`](#qtype_match_options), [`qtype_match_subquestions`](#qtype_match_subquestions)

</details>

<details><summary><b>question/type/multianswer</b> (1 tables)</summary>

[`question_multianswer`](#question_multianswer)

</details>

<details><summary><b>question/type/multichoice</b> (1 tables)</summary>

[`qtype_multichoice_options`](#qtype_multichoice_options)

</details>

<details><summary><b>question/type/numerical</b> (3 tables)</summary>

[`question_numerical`](#question_numerical), [`question_numerical_options`](#question_numerical_options), [`question_numerical_units`](#question_numerical_units)

</details>

<details><summary><b>question/type/ordering</b> (1 tables)</summary>

[`qtype_ordering_options`](#qtype_ordering_options)

</details>

<details><summary><b>question/type/randomsamatch</b> (1 tables)</summary>

[`qtype_randomsamatch_options`](#qtype_randomsamatch_options)

</details>

<details><summary><b>question/type/shortanswer</b> (1 tables)</summary>

[`qtype_shortanswer_options`](#qtype_shortanswer_options)

</details>

<details><summary><b>question/type/truefalse</b> (1 tables)</summary>

[`question_truefalse`](#question_truefalse)

</details>

<details><summary><b>repository/onedrive</b> (1 tables)</summary>

[`repository_onedrive_access`](#repository_onedrive_access)

</details>

<details><summary><b>search/engine/simpledb</b> (1 tables)</summary>

[`search_simpledb_index`](#search_simpledb_index)

</details>

## Table Details

### adminpresets

*Table to store presets data*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO |  |  |  |
| 3 | `name` | varchar(255) | NO | `''` |  |  |
| 4 | `comments` | longtext | YES | `NULL` |  |  |
| 5 | `site` | varchar(255) | NO | `''` |  |  |
| 6 | `author` | varchar(255) | YES | `NULL` |  |  |
| 7 | `moodleversion` | varchar(20) | NO | `''` |  |  |
| 8 | `moodlerelease` | varchar(255) | NO | `''` |  |  |
| 9 | `iscore` | tinyint(1) | NO | `0` |  | Whether this is a core preset or not, and which core preset |
| 10 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 11 | `timeimported` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`

### adminpresets_app

*Applied presets*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `adminpresetid` | bigint(10) | NO |  | MUL |  |
| 3 | `userid` | bigint(10) | NO |  |  |  |
| 4 | `time` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `adminpresetid`

### adminpresets_app_it

*Admin presets applied items. To maintain the relation with config_log*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `adminpresetapplyid` | bigint(10) | NO |  | MUL |  |
| 3 | `configlogid` | bigint(10) | NO |  | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `configlogid`
- **Index**: `adminpresetapplyid`

### adminpresets_app_it_a

*Attributes of the applied items*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `adminpresetapplyid` | bigint(10) | NO |  | MUL |  |
| 3 | `configlogid` | bigint(10) | NO |  | MUL |  |
| 4 | `itemname` | varchar(100) | YES | `NULL` |  | Necessary to rollback |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `configlogid`
- **Index**: `adminpresetapplyid`

### adminpresets_app_plug

*Admin presets plugins applied*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `adminpresetapplyid` | bigint(10) | NO |  | MUL |  |
| 3 | `plugin` | varchar(100) | YES | `NULL` |  |  |
| 4 | `name` | varchar(100) | NO | `''` |  |  |
| 5 | `value` | smallint(4) | NO | `0` |  |  |
| 6 | `oldvalue` | smallint(4) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `adminpresetapplyid`

### adminpresets_it

*Table to store settings*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `adminpresetid` | bigint(10) | NO |  | MUL |  |
| 3 | `plugin` | varchar(100) | YES | `NULL` |  |  |
| 4 | `name` | varchar(100) | NO | `''` |  |  |
| 5 | `value` | longtext | YES | `NULL` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `adminpresetid`

### adminpresets_it_a

*Admin presets items attributes. For settings with attributes (extra values like 'advanced')*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `itemid` | bigint(10) | NO |  | MUL |  |
| 3 | `name` | varchar(100) | NO | `''` |  |  |
| 4 | `value` | longtext | YES | `NULL` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `itemid`

### adminpresets_plug

*Admin presets plugins status, to store information about whether they are enabled or not*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `adminpresetid` | bigint(10) | NO |  | MUL |  |
| 3 | `plugin` | varchar(100) | YES | `NULL` |  |  |
| 4 | `name` | varchar(100) | NO | `''` |  |  |
| 5 | `enabled` | smallint(4) | NO | `0` |  | Whether this plugins is currently enabled. |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `adminpresetid`

### ai_action_explain_text

*Stores specific data about explain text actions.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `prompt` | longtext | YES | `NULL` |  | The text from the user that was used to generate the text response |
| 3 | `responseid` | varchar(128) | YES | `NULL` |  | A unique identifier for the chat completion, returned by the AI. |
| 4 | `fingerprint` | varchar(128) | YES | `NULL` |  | This fingerprint represents the backend configuration that the model runs with. |
| 5 | `generatedcontent` | longtext | YES | `NULL` |  | The contents of the generated message. |
| 6 | `finishreason` | varchar(128) | YES | `NULL` |  | The reason the model stopped generating tokens. |
| 7 | `prompttokens` | bigint(10) | YES | `NULL` |  | Number of tokens in the prompt. |
| 8 | `completiontoken` | bigint(10) | YES | `NULL` |  | Number of tokens in the generated completion. |

**Keys & indexes**

- **Primary key:** `id`

### ai_action_generate_image

*Stores specific data about generate image actions*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `prompt` | longtext | YES | `NULL` |  | The text from the user that was used to generate the image |
| 3 | `numberimages` | bigint(10) | NO |  |  | The number of images requested to be generated |
| 4 | `quality` | varchar(21) | NO | `''` |  | The quality of the image, e.g. hd. |
| 5 | `aspectratio` | varchar(20) | YES | `NULL` |  | The aspect ratio of the generate image, e.g landscape |
| 6 | `style` | varchar(20) | YES | `NULL` |  | The style of the image, e.g. vivid |
| 7 | `sourceurl` | longtext | YES | `NULL` |  | URL of the generated response. |
| 8 | `revisedprompt` | longtext | YES | `NULL` |  | The actual prompt the AI used to generate the image |

**Keys & indexes**

- **Primary key:** `id`

### ai_action_generate_text

*Stores specific data about generate text actions.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `prompt` | longtext | YES | `NULL` |  | The text from the user that was used to generate the text response |
| 3 | `responseid` | varchar(128) | YES | `NULL` |  | A unique identifier for the chat completion, returned by the AI. |
| 4 | `fingerprint` | varchar(128) | YES | `NULL` |  | This fingerprint represents the backend configuration that the model runs with. |
| 5 | `generatedcontent` | longtext | YES | `NULL` |  | The contents of the generated message. |
| 6 | `finishreason` | varchar(128) | YES | `NULL` |  | The reason the model stopped generating tokens. |
| 7 | `prompttokens` | bigint(10) | YES | `NULL` |  | Number of tokens in the prompt. |
| 8 | `completiontoken` | bigint(10) | YES | `NULL` |  | Number of tokens in the generated completion. |

**Keys & indexes**

- **Primary key:** `id`

### ai_action_register

*Stores information about processed ai actions.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `actionname` | varchar(100) | NO | `''` | MUL | Name of the action |
| 3 | `actionid` | bigint(10) | NO |  |  | ID in related action table with more details about the action |
| 4 | `success` | tinyint(1) | NO | `0` |  | Was the action successful when run |
| 5 | `userid` | bigint(10) | NO |  | MUL | The user who made the request to run the action |
| 6 | `contextid` | bigint(10) | NO |  |  | The id of the context the action request was made in |
| 7 | `provider` | varchar(100) | NO | `''` |  | The provider plugin name that processed the action |
| 8 | `errorcode` | smallint(4) | YES | `NULL` |  | If there was an error this was the error code |
| 9 | `errormessage` | longtext | YES | `NULL` |  | If there was an error this was the message |
| 10 | `timecreated` | bigint(10) | NO |  |  | Timestamp of when the action was created |
| 11 | `timecompleted` | bigint(10) | YES | `NULL` |  | Timestamp of when the action was completed, as recorded by the manager |
| 12 | `model` | varchar(50) | YES | `NULL` |  | The model used to generate the response |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)
- **Index** (unique): `actionname`, `actionid`
- **Index**: `actionname`, `provider`

### ai_action_summarise_text

*Stores specific data about summarise text actions.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `prompt` | longtext | YES | `NULL` |  | The text from the user that was used to generate the text response |
| 3 | `responseid` | varchar(128) | YES | `NULL` |  | A unique identifier for the chat completion, returned by the AI. |
| 4 | `fingerprint` | varchar(128) | YES | `NULL` |  | This fingerprint represents the backend configuration that the model runs with. |
| 5 | `generatedcontent` | longtext | YES | `NULL` |  | The contents of the generated message. |
| 6 | `finishreason` | varchar(128) | YES | `NULL` |  | The reason the model stopped generating tokens. |
| 7 | `prompttokens` | bigint(10) | YES | `NULL` |  | Number of tokens in the prompt. |
| 8 | `completiontoken` | bigint(10) | YES | `NULL` |  | Number of tokens in the generated completion. |

**Keys & indexes**

- **Primary key:** `id`

### ai_policy_register

*Register of users who have accepted this sites AI usage policy*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO |  | UNI | The id of the user that has accepted the policy |
| 3 | `contextid` | bigint(10) | NO |  |  | The context id that the policy was accepted in |
| 4 | `timeaccepted` | bigint(10) | NO |  |  | Timestamp of when the policy was accepted |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`) *(unique)*

### ai_providers

*AI provider instances*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `name` | varchar(255) | NO | `''` |  | The human readbale name of the provider |
| 3 | `provider` | varchar(255) | NO | `''` | MUL | The provider class name this provider is an instance of |
| 4 | `enabled` | tinyint(1) | NO | `1` |  | Is this plugin enabled |
| 5 | `config` | longtext | NO |  |  | Provider specific config in JSON format |
| 6 | `actionconfig` | longtext | YES | `NULL` |  | Stores instance specific action configuration in JSON format. |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `provider`

### analytics_indicator_calc

*Stored indicator calculations*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `starttime` | bigint(10) | NO |  | MUL |  |
| 3 | `endtime` | bigint(10) | NO |  |  |  |
| 4 | `contextid` | bigint(10) | NO |  | MUL |  |
| 5 | `sampleorigin` | varchar(255) | NO | `''` |  |  |
| 6 | `sampleid` | bigint(10) | NO |  |  |  |
| 7 | `indicator` | varchar(255) | NO | `''` |  |  |
| 8 | `value` | decimal(10,2) | YES | `NULL` |  | The calculated value, it can be null. |
| 9 | `timecreated` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `contextid` → `context`(`id`)
- **Index**: `starttime`, `endtime`, `contextid`

### analytics_models

*Analytic models.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `enabled` | tinyint(1) | NO | `0` | MUL |  |
| 3 | `trained` | tinyint(1) | NO | `0` |  |  |
| 4 | `name` | varchar(1333) | YES | `NULL` |  | Explicit name of the model, the localised target name is used when left empty |
| 5 | `target` | varchar(255) | NO | `''` |  |  |
| 6 | `indicators` | longtext | NO |  |  |  |
| 7 | `timesplitting` | varchar(255) | YES | `NULL` |  |  |
| 8 | `predictionsprocessor` | varchar(255) | YES | `NULL` |  |  |
| 9 | `version` | bigint(10) | NO |  |  |  |
| 10 | `contextids` | longtext | YES | `NULL` |  | The model will be restricted to this contexts |
| 11 | `timecreated` | bigint(10) | YES | `NULL` |  |  |
| 12 | `timemodified` | bigint(10) | NO |  |  |  |
| 13 | `usermodified` | bigint(10) | NO |  | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `usermodified` → `user`(`id`)
- **Index**: `enabled`, `trained`

### analytics_models_log

*Analytic models changes during evaluation.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `modelid` | bigint(10) | NO |  | MUL |  |
| 3 | `version` | bigint(10) | NO |  |  |  |
| 4 | `evaluationmode` | varchar(50) | NO | `''` |  |  |
| 5 | `target` | varchar(255) | NO | `''` |  |  |
| 6 | `indicators` | longtext | NO |  |  |  |
| 7 | `timesplitting` | varchar(255) | YES | `NULL` |  |  |
| 8 | `score` | decimal(10,5) | NO | `0.00000` |  |  |
| 9 | `info` | longtext | YES | `NULL` |  |  |
| 10 | `dir` | longtext | NO |  |  |  |
| 11 | `timecreated` | bigint(10) | NO |  |  |  |
| 12 | `usermodified` | bigint(10) | NO |  | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `modelid` → `analytics_models`(`id`)
- **FK** `usermodified` → `user`(`id`)

### analytics_predict_samples

*Samples already used for predictions.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `modelid` | bigint(10) | NO |  | MUL |  |
| 3 | `analysableid` | bigint(10) | NO |  |  |  |
| 4 | `timesplitting` | varchar(255) | NO | `''` |  |  |
| 5 | `rangeindex` | bigint(10) | NO |  |  |  |
| 6 | `sampleids` | longtext | NO |  |  |  |
| 7 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 8 | `timemodified` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `modelid` → `analytics_models`(`id`)
- **Index**: `modelid`, `analysableid`, `timesplitting`, `rangeindex`

### analytics_prediction_actions

*Register of user actions over predictions.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `predictionid` | bigint(10) | NO |  | MUL |  |
| 3 | `userid` | bigint(10) | NO |  | MUL |  |
| 4 | `actionname` | varchar(255) | NO | `''` |  |  |
| 5 | `timecreated` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `predictionid` → `analytics_predictions`(`id`)
- **FK** `userid` → `user`(`id`)
- **Index**: `predictionid`, `userid`, `actionname`

### analytics_predictions

*Predictions*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `modelid` | bigint(10) | NO |  | MUL |  |
| 3 | `contextid` | bigint(10) | NO |  | MUL |  |
| 4 | `sampleid` | bigint(10) | NO |  |  |  |
| 5 | `rangeindex` | mediumint(5) | NO |  |  |  |
| 6 | `prediction` | decimal(10,2) | NO |  |  |  |
| 7 | `predictionscore` | decimal(10,5) | NO |  |  |  |
| 8 | `calculations` | longtext | NO |  |  |  |
| 9 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 10 | `timestart` | bigint(10) | YES | `NULL` |  |  |
| 11 | `timeend` | bigint(10) | YES | `NULL` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `modelid` → `analytics_models`(`id`)
- **FK** `contextid` → `context`(`id`)
- **Index**: `modelid`, `contextid`

### analytics_train_samples

*Samples used for training*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `modelid` | bigint(10) | NO |  | MUL |  |
| 3 | `analysableid` | bigint(10) | NO |  |  |  |
| 4 | `timesplitting` | varchar(255) | NO | `''` |  |  |
| 5 | `sampleids` | longtext | NO |  |  |  |
| 6 | `timecreated` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `modelid` → `analytics_models`(`id`)
- **Index**: `modelid`, `analysableid`, `timesplitting`

### analytics_used_analysables

*List of analysables used by each model*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `modelid` | bigint(10) | NO |  | MUL |  |
| 3 | `action` | varchar(50) | NO | `''` |  |  |
| 4 | `analysableid` | bigint(10) | NO |  | MUL |  |
| 5 | `firstanalysis` | bigint(10) | NO |  |  |  |
| 6 | `timeanalysed` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `modelid` → `analytics_models`(`id`)
- **Index**: `modelid`, `action`
- **Index**: `analysableid`

### analytics_used_files

*Files that have already been used for training and prediction.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `modelid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `fileid` | bigint(10) | NO | `0` | MUL |  |
| 4 | `action` | varchar(50) | NO | `''` |  |  |
| 5 | `time` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `modelid` → `analytics_models`(`id`)
- **FK** `fileid` → `files`(`id`)
- **Index**: `modelid`, `action`, `fileid`

### assign

*This table saves information about an instance of mod_assign in a course.*

<sub>defined in `public/mod/assign/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `course` | bigint(10) | NO | `0` | MUL |  |
| 3 | `name` | varchar(1333) | NO | `''` |  | The name of the instance of the assignment. Displayed at the top of each page. |
| 4 | `intro` | longtext | NO |  |  | The description of the assignment. This field is used by feature MOD_INTRO. |
| 5 | `introformat` | smallint(4) | NO | `0` |  | The format of the description field of the assignment. This field is used by feature MOD_INTRO. |
| 6 | `alwaysshowdescription` | tinyint(2) | NO | `0` |  | If false the assignment intro will only be displayed after the allowsubmissionsfrom date. If true it will always be displayed. |
| 7 | `nosubmissions` | tinyint(2) | NO | `0` |  | This field is a cache for is_any_submission_plugin_enabled() which allows Moodle pages to distinguish offline assignment types without loading the assignment class. |
| 8 | `submissiondrafts` | tinyint(2) | NO | `0` |  | If true, assignment submissions will be considered drafts until the student clicks on the submit assignmnet button. |
| 9 | `sendnotifications` | tinyint(2) | NO | `0` |  | Allows the disabling of email notifications in the assign module. |
| 10 | `sendlatenotifications` | tinyint(2) | NO | `0` |  | Allows separate enabling of notifications for late assignment submissions. |
| 11 | `duedate` | bigint(10) | NO | `0` |  | The due date for the assignment. Displayed to students. |
| 12 | `allowsubmissionsfromdate` | bigint(10) | NO | `0` |  | If set, submissions will only be accepted after this date. |
| 13 | `grade` | bigint(10) | NO | `0` |  | The maximum grade for this assignment. Can be negative to indicate the use of a scale. |
| 14 | `timemodified` | bigint(10) | NO | `0` |  | The time the settings for this assign module instance were last modified. |
| 15 | `requiresubmissionstatement` | tinyint(2) | NO | `0` |  | Forces the student to accept a submission statement when submitting an assignment |
| 16 | `completionsubmit` | tinyint(2) | NO | `0` |  | If this field is set to 1, then the activity will be automatically marked as 'complete' once the user submits their assignment. |
| 17 | `cutoffdate` | bigint(10) | NO | `0` |  | The final date after which submissions will no longer be accepted for this assignment without an extensions. |
| 18 | `gradingduedate` | bigint(10) | NO | `0` |  | The expected date for marking the submissions. |
| 19 | `teamsubmission` | tinyint(2) | NO | `0` |  | Do students submit in teams? |
| 20 | `requireallteammemberssubmit` | tinyint(2) | NO | `0` |  | If enabled, a submission will not be accepted until all team members have submitted it. |
| 21 | `teamsubmissiongroupingid` | bigint(10) | NO | `0` | MUL | A grouping id to get groups for team submissions |
| 22 | `blindmarking` | tinyint(2) | NO | `0` |  | Hide student/grader identities until the reveal identities action is performed |
| 23 | `hidegrader` | tinyint(2) | NO | `0` |  | Hide the grader's identity from students. The opposite of blind marking. |
| 24 | `revealidentities` | tinyint(2) | NO | `0` |  | Show identities for a blind marking assignment |
| 25 | `attemptreopenmethod` | varchar(10) | NO | `'untilpass'` |  | How to determine when students are allowed to open a new submission. Valid options are manual and untilpass. |
| 26 | `maxattempts` | mediumint(6) | NO | `1` |  | What is the maximum number of student attempts allowed for this assignment? -1 means unlimited. |
| 27 | `markingworkflow` | tinyint(2) | NO | `0` |  | If enabled, marking workflow features will be used in this assignment. |
| 28 | `markingallocation` | tinyint(2) | NO | `0` |  | If enabled, marking allocation features will be used in this assignment |
| 29 | `markercount` | tinyint(2) | NO | `1` |  | Number of markers for this assignment, for example, 2 for double marking |
| 30 | `multimarkmethod` | varchar(10) | YES | `NULL` |  | How to calculate grade when markercount greater than 1 |
| 31 | `multimarkrounding` | tinyint(2) | YES | `NULL` |  | How to round the grade calculation if using an average of marks |
| 32 | `markinganonymous` | tinyint(2) | NO | `0` |  | If enabled, marking anonymous features will be used in this assignment |
| 33 | `sendstudentnotifications` | tinyint(2) | NO | `1` |  | Default for send student notifications checkbox when grading. |
| 34 | `preventsubmissionnotingroup` | tinyint(2) | NO | `0` |  | If enabled a user will be unable to make a submission unless they are a member of a group. |
| 35 | `activity` | longtext | YES | `NULL` |  |  |
| 36 | `activityformat` | smallint(4) | NO | `0` |  |  |
| 37 | `timelimit` | bigint(10) | NO | `0` |  |  |
| 38 | `submissionattachments` | tinyint(2) | NO | `0` |  |  |
| 39 | `gradepenalty` | tinyint(2) | NO | `0` | MUL | If enabled, penalties will be applied. |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `course`
- **Index**: `teamsubmissiongroupingid`
- **Index**: `gradepenalty`

### assign_allocated_marker

*One or more teachers allocated to mark individual submissions*

<sub>defined in `public/mod/assign/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `student` | bigint(10) | NO | `0` | MUL | User ID of student this marker is allocated to |
| 3 | `assignment` | bigint(10) | NO | `0` | MUL | The id of the assignment this marker is allocated to |
| 4 | `marker` | bigint(10) | NO | `0` | MUL | User ID of teacher allocated to mark this student |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `student` → `user`(`id`)
- **FK** `assignment` → `assign`(`id`)
- **FK** `marker` → `user`(`id`)

### assign_grades

*Grading information about a single assignment submission.*

<sub>defined in `public/mod/assign/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `assignment` | bigint(10) | NO | `0` | MUL |  |
| 3 | `userid` | bigint(10) | NO | `0` | MUL |  |
| 4 | `timecreated` | bigint(10) | NO | `0` |  | The time the assignment submission was first modified by a grader. |
| 5 | `timemodified` | bigint(10) | NO | `0` |  | The most recent modification time for the assignment submission by a grader. |
| 6 | `grader` | bigint(10) | NO | `0` |  |  |
| 7 | `grade` | decimal(10,5) | YES | `0.00000` |  | The numerical grade for this assignment submission. Can be determined by scales/advancedgradingforms etc but will always be converted back to a floating point number. |
| 8 | `penalty` | decimal(10,5) | NO | `0.00000` |  | The percentage should be deducted from final grade |
| 9 | `attemptnumber` | bigint(10) | NO | `0` | MUL | The attempt number that this grade relates to |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `assignment` → `assign`(`id`)
- **Index**: `userid`
- **Index**: `attemptnumber`
- **Index** (unique): `assignment`, `userid`, `attemptnumber`

### assign_mark

*Marks from multiple markers for a single submission*

<sub>defined in `public/mod/assign/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `assignment` | bigint(10) | NO | `0` | MUL | The ID of the assignment this mark applies to |
| 3 | `gradeid` | bigint(10) | NO | `0` | MUL | The ID of an assign_grades row |
| 4 | `timecreated` | bigint(10) | NO | `0` |  | The time this mark was created |
| 5 | `timemodified` | bigint(10) | NO | `0` |  | The time this mark was modified |
| 6 | `marker` | bigint(10) | NO | `0` | MUL | The user ID of the marker |
| 7 | `mark` | decimal(10,5) | YES | `NULL` |  | Mark given by marker |
| 8 | `workflowstate` | varchar(20) | YES | `NULL` |  | The current workflow state of the mark |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `assignment` → `assign`(`id`)
- **FK** `gradeid` → `assign_grades`(`id`)
- **FK** `marker` → `user`(`id`)

### assign_overrides

*The overrides to assign settings.*

<sub>defined in `public/mod/assign/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `assignid` | bigint(10) | NO | `0` | MUL | Foreign key references assign.id |
| 3 | `groupid` | bigint(10) | YES | `NULL` | MUL | Foreign key references groups.id.  Can be null if this is a per-user override. |
| 4 | `userid` | bigint(10) | YES | `NULL` | MUL | Foreign key references user.id.  Can be null if this is a per-group override. |
| 5 | `sortorder` | bigint(10) | YES | `NULL` |  | Rank for sorting overrides. |
| 6 | `allowsubmissionsfromdate` | bigint(10) | YES | `NULL` |  | Time at which students may start attempting this assign. Can be null, in which case the assign default is used. |
| 7 | `duedate` | bigint(10) | YES | `NULL` |  | Time by which students must have completed their attempt.  Can be null, in which case the assign default is used. |
| 8 | `cutoffdate` | bigint(10) | YES | `NULL` |  | Time by which students must have completed their attempt.  Can be null, in which case the assign default is used. |
| 9 | `timelimit` | bigint(10) | YES | `NULL` |  | Time limit in seconds. Can be null, in which case the quiz default is used. |
| 10 | `reason` | longtext | YES | `NULL` |  | An optional reason explaining why this override was granted. |
| 11 | `reasonformat` | tinyint(2) | NO | `0` |  | The internal format for the override reason. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `assignid` → `assign`(`id`)
- **FK** `groupid` → `groups`(`id`)
- **FK** `userid` → `user`(`id`)

### assign_plugin_config

*Config data for an instance of a plugin in an assignment.*

<sub>defined in `public/mod/assign/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `assignment` | bigint(10) | NO | `0` | MUL |  |
| 3 | `plugin` | varchar(28) | NO | `''` | MUL |  |
| 4 | `subtype` | varchar(28) | NO | `''` | MUL |  |
| 5 | `name` | varchar(28) | NO | `''` | MUL |  |
| 6 | `value` | longtext | YES | `NULL` |  | The value of the config setting. Stored as text but can be interpreted by the plugin however it likes. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `assignment` → `assign`(`id`)
- **Index**: `plugin`
- **Index**: `subtype`
- **Index**: `name`

### assign_submission

*This table keeps information about student interactions with the mod/assign. This is limited to metadata about a student submission but does not include the submission itself which is stored by plugins.*

<sub>defined in `public/mod/assign/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `assignment` | bigint(10) | NO | `0` | MUL |  |
| 3 | `userid` | bigint(10) | NO | `0` | MUL |  |
| 4 | `timecreated` | bigint(10) | NO | `0` |  | The time of the first student submission to this assignment. |
| 5 | `timemodified` | bigint(10) | NO | `0` |  | The last time this assignment submission was modified by a student. |
| 6 | `timestarted` | bigint(10) | YES | `NULL` |  | The time when the student stared the submission. |
| 7 | `status` | varchar(10) | YES | `NULL` |  | The status of this assignment submission. The current statuses are DRAFT and SUBMITTED. |
| 8 | `groupid` | bigint(10) | NO | `0` |  | The group id for team submissions |
| 9 | `attemptnumber` | bigint(10) | NO | `0` | MUL | Used to track attempts for an assignment |
| 10 | `latest` | tinyint(2) | NO | `0` |  | Greatly simplifies queries wanting to know information about only the latest attempt. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `assignment` → `assign`(`id`)
- **Index**: `userid`
- **Index**: `attemptnumber`
- **Index** (unique): `assignment`, `userid`, `groupid`, `attemptnumber`
- **Index**: `assignment`, `userid`, `groupid`, `latest`

### assign_user_flags

*List of flags that can be set for a single user in a single assignment.*

<sub>defined in `public/mod/assign/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO | `0` | MUL | The id of the user these flags apply to. |
| 3 | `assignment` | bigint(10) | NO | `0` | MUL | The assignment these flags apply to. |
| 4 | `locked` | bigint(10) | NO | `0` |  | Student cannot make any changes to their submission if this flag is set. |
| 5 | `mailed` | smallint(4) | NO | `0` | MUL | Has the student been sent a notification about this grade update? |
| 6 | `extensionduedate` | bigint(10) | NO | `0` |  | An extension date assigned to an individual student. |
| 7 | `workflowstate` | varchar(20) | YES | `NULL` |  | The current workflow state of the grade |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)
- **FK** `assignment` → `assign`(`id`)
- **Index**: `mailed`

### assign_user_mapping

*Map an assignment specific id number to a user*

<sub>defined in `public/mod/assign/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `assignment` | bigint(10) | NO | `0` | MUL |  |
| 3 | `userid` | bigint(10) | NO | `0` | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `assignment` → `assign`(`id`)
- **FK** `userid` → `user`(`id`)

### assignfeedback_comments

*Text feedback for submitted assignments*

<sub>defined in `public/mod/assign/feedback/comments/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `assignment` | bigint(10) | NO | `0` | MUL |  |
| 3 | `grade` | bigint(10) | NO | `0` | MUL |  |
| 4 | `mark` | bigint(10) | YES | `NULL` |  | ID of the assign_mark record if applicable |
| 5 | `commenttext` | longtext | YES | `NULL` |  | The feedback text |
| 6 | `commentformat` | smallint(4) | NO | `0` |  | The feedback text format |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `assignment` → `assign`(`id`)
- **FK** `grade` → `assign_grades`(`id`)

### assignfeedback_editpdf_annot

*stores annotations added to pdfs submitted by students*

<sub>defined in `public/mod/assign/feedback/editpdf/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `gradeid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `markid` | bigint(10) | YES | `NULL` | MUL |  |
| 4 | `pageno` | bigint(10) | NO | `0` |  | The page in the PDF that this annotation appears on |
| 5 | `x` | bigint(10) | YES | `0` |  | x-position of the start of the annotation (in pixels - image resolution is set to 100 pixels per inch) |
| 6 | `y` | bigint(10) | YES | `0` |  | y-position of the start of the annotation (in pixels - image resolution is set to 100 pixels per inch) |
| 7 | `endx` | bigint(10) | YES | `0` |  | x-position of the end of the annotation |
| 8 | `endy` | bigint(10) | YES | `0` |  | y-position of the end of the annotation |
| 9 | `path` | longtext | YES | `NULL` |  | SVG path describing the freehand line |
| 10 | `type` | varchar(10) | YES | `'line'` |  | line, oval, rect, etc. |
| 11 | `colour` | varchar(10) | YES | `'black'` |  | Can be red, yellow, green, blue, white, black |
| 12 | `draft` | tinyint(2) | NO | `1` |  | Is this a draft annotation? |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `gradeid` → `assign_grades`(`id`)
- **FK** `markid` → `assign_mark`(`id`)
- **Index**: `gradeid`, `pageno`

### assignfeedback_editpdf_cmnt

*Stores comments added to pdfs*

<sub>defined in `public/mod/assign/feedback/editpdf/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `gradeid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `markid` | bigint(10) | YES | `NULL` | MUL |  |
| 4 | `x` | bigint(10) | YES | `0` |  | x-position of the top-left corner of the comment (in pixels - image resolution is set to 100 pixels per inch) |
| 5 | `y` | bigint(10) | YES | `0` |  | y-position of the top-left corner of the comment (in pixels - image resolution is set to 100 pixels per inch) |
| 6 | `width` | bigint(10) | YES | `120` |  | width, in pixels, of the comment box |
| 7 | `rawtext` | longtext | YES | `NULL` |  | Raw text of the comment |
| 8 | `pageno` | bigint(10) | NO | `0` |  | The page in the PDF that this comment appears on |
| 9 | `colour` | varchar(10) | YES | `'black'` |  | Can be red, yellow, green, blue, white, black |
| 10 | `draft` | tinyint(2) | NO | `1` |  | Is this a draft comment? |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `gradeid` → `assign_grades`(`id`)
- **FK** `markid` → `assign_mark`(`id`)
- **Index**: `gradeid`, `pageno`

### assignfeedback_editpdf_quick

*Stores teacher specified quicklist comments*

<sub>defined in `public/mod/assign/feedback/editpdf/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `rawtext` | longtext | NO |  |  |  |
| 4 | `width` | bigint(10) | NO | `120` |  |  |
| 5 | `colour` | varchar(10) | YES | `'yellow'` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)

### assignfeedback_editpdf_rot

*Stores rotation information of a page.*

<sub>defined in `public/mod/assign/feedback/editpdf/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `gradeid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `markid` | bigint(10) | YES | `NULL` | MUL |  |
| 4 | `pageno` | bigint(10) | NO | `0` |  | Page number |
| 5 | `pathnamehash` | longtext | NO |  |  | File path hash of the rotated page |
| 6 | `isrotated` | tinyint(1) | NO | `0` |  | Whether the page is rotated or not |
| 7 | `degree` | bigint(10) | NO | `0` |  | Rotation degree |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `gradeid` → `assign_grades`(`id`)
- **FK** `markid` → `assign_mark`(`id`)
- **Index** (unique): `gradeid`, `markid`, `pageno`

### assignfeedback_file

*Stores info about the number of files submitted by a student.*

<sub>defined in `public/mod/assign/feedback/file/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `assignment` | bigint(10) | NO | `0` | MUL |  |
| 3 | `grade` | bigint(10) | NO | `0` | MUL |  |
| 4 | `mark` | bigint(10) | YES | `NULL` | MUL | ID of the assign_mark record if applicable |
| 5 | `numfiles` | bigint(10) | NO | `0` |  | The number of files uploaded by a grader. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `assignment` → `assign`(`id`)
- **FK** `grade` → `assign_grades`(`id`)
- **FK** `mark` → `assign_mark`(`id`)

### assignsubmission_file

*Info about file submissions for assignments*

<sub>defined in `public/mod/assign/submission/file/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `assignment` | bigint(10) | NO | `0` | MUL |  |
| 3 | `submission` | bigint(10) | NO | `0` | MUL |  |
| 4 | `numfiles` | bigint(10) | NO | `0` |  | The number of files the student submitted. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `assignment` → `assign`(`id`)
- **FK** `submission` → `assign_submission`(`id`)

### assignsubmission_onlinetext

*Info about onlinetext submission*

<sub>defined in `public/mod/assign/submission/onlinetext/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `assignment` | bigint(10) | NO | `0` | MUL |  |
| 3 | `submission` | bigint(10) | NO | `0` | MUL |  |
| 4 | `onlinetext` | longtext | YES | `NULL` |  | The text for this online text submission. |
| 5 | `onlineformat` | smallint(4) | NO | `0` |  | The format for this online text submission. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `assignment` → `assign`(`id`)
- **FK** `submission` → `assign_submission`(`id`)

### auth_lti_linked_login

*Accounts linked to a users Moodle account.*

<sub>defined in `public/auth/lti/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO |  | MUL | The user account the LTI user is linked to. |
| 3 | `issuer` | longtext | NO |  |  |  |
| 4 | `issuer256` | varchar(64) | NO | `''` |  | SHA256 hash of the issuer from which the platform user originates. |
| 5 | `sub` | varchar(255) | NO | `''` |  |  |
| 6 | `sub256` | varchar(64) | NO | `''` |  | SHA256 hash of the subject identifying the user for the issuer. |
| 7 | `timecreated` | bigint(10) | NO |  |  |  |
| 8 | `timemodified` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)
- **Unique:** `userid`, `issuer256`, `sub256`

### auth_oauth2_linked_login

*Accounts linked to a users Moodle account.*

<sub>defined in `public/auth/oauth2/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `timecreated` | bigint(10) | NO |  |  |  |
| 3 | `timemodified` | bigint(10) | NO |  |  |  |
| 4 | `usermodified` | bigint(10) | NO |  | MUL |  |
| 5 | `userid` | bigint(10) | NO |  | MUL | The user account this oauth login is linked to. |
| 6 | `issuerid` | bigint(10) | NO |  | MUL |  |
| 7 | `username` | varchar(255) | NO | `''` |  | The external username to map to this moodle account |
| 8 | `email` | longtext | NO |  |  | The external email to map to this moodle account |
| 9 | `confirmtoken` | varchar(64) | NO | `''` |  | If this is not empty - the user has not confirmed their email to create the link. |
| 10 | `confirmtokenexpires` | bigint(10) | YES | `NULL` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `usermodified` → `user`(`id`)
- **FK** `userid` → `user`(`id`)
- **FK** `issuerid` → `oauth2_issuer`(`id`)
- **Unique:** `userid`, `issuerid`, `username`
- **Index**: `issuerid`, `username`

### backup_controllers

*To store the backup_controllers as they are used*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `backupid` | varchar(32) | NO | `''` | UNI | unique id of the backup |
| 3 | `operation` | varchar(20) | NO | `'backup'` |  | Type of operation (backup/restore) |
| 4 | `type` | varchar(10) | NO | `''` | MUL | Type of the backup (activity/section/course) |
| 5 | `itemid` | bigint(10) | NO |  |  | id of the module/section/activity being backup |
| 6 | `format` | varchar(20) | NO | `''` |  | format of the backup (moodle/imscc...) |
| 7 | `interactive` | smallint(4) | NO |  |  | is the backup interactive (1-yes/0-no) |
| 8 | `purpose` | smallint(4) | NO |  |  | purpose (target) of the backup (general, import, hub...) |
| 9 | `userid` | bigint(10) | NO |  | MUL | user that owns/performs the backup |
| 10 | `status` | smallint(4) | NO |  |  | current status of the backup (configured, ui, running...) |
| 11 | `execution` | smallint(4) | NO |  |  | type of execution (immediate/delayed) |
| 12 | `executiontime` | bigint(10) | NO |  |  | epoch secs when the backup should be executed (for delayed backups only) |
| 13 | `checksum` | varchar(32) | NO | `''` |  | checksum of the backup_controller object |
| 14 | `timecreated` | bigint(10) | NO |  |  | time the controller was created |
| 15 | `timemodified` | bigint(10) | NO |  |  | last time the controller was modified |
| 16 | `progress` | decimal(15,14) | NO | `0.00000000000000` |  | The backup or restore progress as a floating point number |
| 17 | `controller` | longtext | NO |  |  | serialised backup_controller object |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)
- **Unique:** `backupid`
- **Index**: `type`, `itemid`
- **Index**: `userid`, `itemid`

### backup_courses

*To store every course backup status*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `courseid` | bigint(10) | NO | `0` | UNI |  |
| 3 | `laststarttime` | bigint(10) | NO | `0` |  |  |
| 4 | `lastendtime` | bigint(10) | NO | `0` |  |  |
| 5 | `laststatus` | varchar(1) | NO | `'5'` |  |  |
| 6 | `nextstarttime` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Unique:** `courseid`

### backup_logs

*To store all the logs from backup and restore operations (by db logger)*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `backupid` | varchar(32) | NO | `''` | MUL | backupid the log record belongs to |
| 3 | `loglevel` | smallint(4) | NO |  |  | level of the log (debug...error) |
| 4 | `message` | longtext | NO |  |  | text logged |
| 5 | `timecreated` | bigint(10) | NO |  |  | timestamp this log entry was created |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `backupid` → `backup_controllers`(`backupid`)
- **Index** (unique): `backupid`, `id`

### badge

*Defines badge*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `name` | varchar(1333) | NO | `''` |  |  |
| 3 | `description` | longtext | YES | `NULL` |  |  |
| 4 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 5 | `timemodified` | bigint(10) | NO | `0` |  |  |
| 6 | `usercreated` | bigint(10) | NO |  | MUL |  |
| 7 | `usermodified` | bigint(10) | NO |  | MUL |  |
| 8 | `issuername` | varchar(1333) | NO | `''` |  |  |
| 9 | `issuerurl` | varchar(255) | NO | `''` |  |  |
| 10 | `issuercontact` | varchar(255) | YES | `NULL` |  |  |
| 11 | `expiredate` | bigint(10) | YES | `NULL` |  |  |
| 12 | `expireperiod` | bigint(10) | YES | `NULL` |  |  |
| 13 | `type` | tinyint(1) | NO | `1` | MUL | 1 = site, 2 = course |
| 14 | `courseid` | bigint(10) | YES | `NULL` | MUL |  |
| 15 | `message` | longtext | NO |  |  |  |
| 16 | `messagesubject` | longtext | NO |  |  |  |
| 17 | `attachment` | tinyint(1) | NO | `1` |  | Attach baked badge for download |
| 18 | `notification` | tinyint(1) | NO | `1` |  | Message when badge is awarded |
| 19 | `status` | tinyint(1) | NO | `0` |  | Badge status: 0 = inactive, 1 = active, 2 = active+locked, 3 = inactive+locked, 4 = archived |
| 20 | `nextcron` | bigint(10) | YES | `NULL` |  |  |
| 21 | `version` | varchar(255) | YES | `NULL` |  |  |
| 22 | `language` | varchar(255) | YES | `NULL` |  |  |
| 23 | `imagecaption` | longtext | YES | `NULL` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `courseid` → `course`(`id`)
- **FK** `usermodified` → `user`(`id`)
- **FK** `usercreated` → `user`(`id`)
- **Index**: `type`

### badge_alignment

*Defines alignment for badges*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `badgeid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `targetname` | varchar(255) | NO | `''` |  |  |
| 4 | `targeturl` | varchar(255) | NO | `''` |  |  |
| 5 | `targetdescription` | longtext | YES | `NULL` |  |  |
| 6 | `targetframework` | varchar(255) | YES | `NULL` |  |  |
| 7 | `targetcode` | varchar(255) | YES | `NULL` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `badgeid` → `badge`(`id`)

### badge_backpack

*Defines settings for connecting external backpack*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `email` | varchar(100) | NO | `''` |  |  |
| 4 | `backpackuid` | bigint(10) | NO |  |  |  |
| 5 | `autosync` | tinyint(1) | NO | `0` |  |  |
| 6 | `password` | varchar(50) | YES | `NULL` |  |  |
| 7 | `externalbackpackid` | bigint(10) | YES | `NULL` | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)
- **FK** `externalbackpackid` → `badge_external_backpack`(`id`)
- **Unique:** `userid`, `externalbackpackid`

### badge_backpack_oauth2

*Default comment for the table, please edit me*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `usermodified` | bigint(10) | NO | `0` | MUL |  |
| 3 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 4 | `timemodified` | bigint(10) | NO | `0` |  |  |
| 5 | `userid` | bigint(10) | NO |  | MUL |  |
| 6 | `issuerid` | bigint(10) | NO |  | MUL |  |
| 7 | `externalbackpackid` | bigint(10) | NO |  | MUL |  |
| 8 | `token` | longtext | NO |  |  |  |
| 9 | `refreshtoken` | longtext | NO |  |  |  |
| 10 | `expires` | bigint(10) | YES | `NULL` |  |  |
| 11 | `scope` | longtext | YES | `NULL` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `usermodified` → `user`(`id`)
- **FK** `userid` → `user`(`id`)
- **FK** `issuerid` → `oauth2_issuer`(`id`)
- **FK** `externalbackpackid` → `badge_external_backpack`(`id`)

### badge_criteria

*Defines criteria for issuing badges*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `badgeid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `criteriatype` | bigint(10) | YES | `NULL` | MUL | The criteria type we are aggregating |
| 4 | `method` | tinyint(1) | NO | `1` |  | 1 = all, 2 = any |
| 5 | `description` | longtext | YES | `NULL` |  |  |
| 6 | `descriptionformat` | tinyint(2) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `badgeid` → `badge`(`id`)
- **Index**: `criteriatype`
- **Index** (unique): `badgeid`, `criteriatype`

### badge_criteria_met

*Defines criteria that were met for an issued badge*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `issuedid` | bigint(10) | YES | `NULL` | MUL |  |
| 3 | `critid` | bigint(10) | NO |  | MUL |  |
| 4 | `userid` | bigint(10) | NO |  | MUL |  |
| 5 | `datemet` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `critid` → `badge_criteria`(`id`)
- **FK** `userid` → `user`(`id`)
- **FK** `issuedid` → `badge_issued`(`id`)

### badge_criteria_param

*Defines parameters for badges criteria*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `critid` | bigint(10) | NO |  | MUL |  |
| 3 | `name` | varchar(255) | NO | `''` |  |  |
| 4 | `value` | varchar(255) | YES | `NULL` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `critid` → `badge_criteria`(`id`)

### badge_endorsement

*Defines endorsement for badge*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `badgeid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `issuername` | varchar(255) | NO | `''` |  |  |
| 4 | `issuerurl` | varchar(255) | NO | `''` |  |  |
| 5 | `issueremail` | varchar(255) | NO | `''` |  |  |
| 6 | `claimid` | varchar(255) | YES | `NULL` |  |  |
| 7 | `claimcomment` | longtext | YES | `NULL` |  |  |
| 8 | `dateissued` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `badgeid` → `badge`(`id`)

### badge_external

*Setting for external badges display*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `backpackid` | bigint(10) | NO |  | MUL | ID of a backpack |
| 3 | `collectionid` | bigint(10) | NO |  |  | Badge collection id in the backpack |
| 4 | `entityid` | varchar(255) | YES | `NULL` |  |  |
| 5 | `assertion` | longtext | YES | `NULL` |  | Assertion of external badge |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `backpackid` → `badge_backpack`(`id`)

### badge_external_backpack

*Defines settings for site level backpacks that a user can connect to.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `backpackapiurl` | varchar(255) | NO | `''` | UNI |  |
| 3 | `backpackweburl` | varchar(255) | NO | `''` | UNI |  |
| 4 | `apiversion` | varchar(12) | NO | `''` |  |  |
| 5 | `sortorder` | bigint(10) | NO | `0` |  |  |
| 6 | `oauth2_issuerid` | bigint(10) | YES | `NULL` | MUL | OAuth 2 Issuer |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `oauth2_issuerid` → `oauth2_issuer`(`id`)
- **Unique:** `backpackapiurl`
- **Unique:** `backpackweburl`

### badge_external_identifier

*Setting for external badges mappings*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `sitebackpackid` | bigint(10) | NO |  | MUL | ID of a site backpack |
| 3 | `internalid` | varchar(128) | NO | `''` |  |  |
| 4 | `externalid` | varchar(128) | NO | `''` |  |  |
| 5 | `type` | varchar(16) | NO | `''` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `sitebackpackid` → `badge_backpack`(`id`)
- **Unique:** `sitebackpackid`, `internalid`, `externalid`, `type`

### badge_issued

*Defines issued badges*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `badgeid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `userid` | bigint(10) | NO | `0` | MUL |  |
| 4 | `uniquehash` | longtext | NO |  |  |  |
| 5 | `dateissued` | bigint(10) | NO | `0` |  |  |
| 6 | `dateexpire` | bigint(10) | YES | `NULL` |  |  |
| 7 | `visible` | tinyint(1) | NO | `0` |  |  |
| 8 | `issuernotified` | bigint(10) | YES | `NULL` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `badgeid` → `badge`(`id`)
- **FK** `userid` → `user`(`id`)
- **Index** (unique): `badgeid`, `userid`

### badge_manual_award

*Track manual award criteria for badges*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `badgeid` | bigint(10) | NO |  | MUL |  |
| 3 | `recipientid` | bigint(10) | NO |  | MUL |  |
| 4 | `issuerid` | bigint(10) | NO |  | MUL |  |
| 5 | `issuerrole` | bigint(10) | NO |  | MUL |  |
| 6 | `datemet` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `badgeid` → `badge`(`id`)
- **FK** `recipientid` → `user`(`id`)
- **FK** `issuerid` → `user`(`id`)
- **FK** `issuerrole` → `role`(`id`)

### badge_related

*Defines badge related for badges*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `badgeid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `relatedbadgeid` | bigint(10) | YES | `NULL` | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `badgeid` → `badge`(`id`)
- **FK** `relatedbadgeid` → `badge`(`id`)
- **Unique:** `badgeid`, `relatedbadgeid`

### bigbluebuttonbn

*The bigbluebuttonbn table to store information about a meeting activities.*

<sub>defined in `public/mod/bigbluebuttonbn/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `type` | tinyint(2) | NO | `0` |  |  |
| 3 | `course` | bigint(10) | NO | `0` |  |  |
| 4 | `name` | varchar(1333) | NO | `''` |  |  |
| 5 | `intro` | longtext | YES | `NULL` |  |  |
| 6 | `introformat` | smallint(4) | NO | `1` |  |  |
| 7 | `meetingid` | varchar(255) | NO | `''` |  |  |
| 8 | `moderatorpass` | varchar(255) | NO | `''` |  |  |
| 9 | `viewerpass` | varchar(255) | NO | `''` |  |  |
| 10 | `wait` | tinyint(1) | NO | `0` |  |  |
| 11 | `record` | tinyint(1) | NO | `0` |  |  |
| 12 | `recordallfromstart` | tinyint(1) | NO | `0` |  |  |
| 13 | `recordhidebutton` | tinyint(1) | NO | `0` |  |  |
| 14 | `welcome` | longtext | YES | `NULL` |  |  |
| 15 | `voicebridge` | mediumint(5) | NO | `0` |  |  |
| 16 | `openingtime` | bigint(10) | NO | `0` |  |  |
| 17 | `closingtime` | bigint(10) | NO | `0` |  |  |
| 18 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 19 | `timemodified` | bigint(10) | NO | `0` |  |  |
| 20 | `presentation` | longtext | YES | `NULL` |  |  |
| 21 | `participants` | longtext | YES | `NULL` |  |  |
| 22 | `userlimit` | smallint(3) | NO | `0` |  |  |
| 23 | `recordings_html` | tinyint(1) | NO | `0` |  |  |
| 24 | `recordings_deleted` | tinyint(1) | NO | `1` |  |  |
| 25 | `recordings_imported` | tinyint(1) | NO | `0` |  |  |
| 26 | `recordings_preview` | tinyint(1) | NO | `0` |  |  |
| 27 | `clienttype` | tinyint(1) | NO | `0` |  |  |
| 28 | `muteonstart` | tinyint(1) | NO | `0` |  |  |
| 29 | `disablecam` | tinyint(1) | NO | `0` |  |  |
| 30 | `disablemic` | tinyint(1) | NO | `0` |  |  |
| 31 | `disableprivatechat` | tinyint(1) | NO | `0` |  |  |
| 32 | `disablepublicchat` | tinyint(1) | NO | `0` |  |  |
| 33 | `disablenote` | tinyint(1) | NO | `0` |  |  |
| 34 | `hideuserlist` | tinyint(1) | NO | `0` |  |  |
| 35 | `completionattendance` | int(9) | NO | `0` |  | Nonzero if a certain number of minutes in the meeting are required to mark an activity completed for a user. |
| 36 | `completionengagementchats` | int(9) | NO | `0` |  | Nonzero if chat during the meeting is required to mark an activity completed for a user. |
| 37 | `completionengagementtalks` | int(9) | NO | `0` |  | Nonzero if talking during the meeting is required to mark an activity completed for a user. |
| 38 | `completionengagementraisehand` | int(9) | NO | `0` |  | Nonzero if raising hand during the meeting is required to mark an activity completed for a user. |
| 39 | `completionengagementpollvotes` | int(9) | NO | `0` |  | Nonzero if poll voting during the meeting is required to mark an activity completed for a user. |
| 40 | `completionengagementemojis` | int(9) | NO | `0` |  | Nonzero if the use of emojis during the meeting is required to mark an activity completed for a user. |
| 41 | `guestallowed` | tinyint(2) | YES | `0` |  |  |
| 42 | `mustapproveuser` | tinyint(2) | YES | `1` |  |  |
| 43 | `guestlinkuid` | varchar(1024) | YES | `NULL` |  |  |
| 44 | `guestpassword` | varchar(255) | YES | `NULL` |  |  |
| 45 | `showpresentation` | tinyint(1) | NO | `1` |  |  |
| 46 | `grade` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`

### bigbluebuttonbn_logs

*The bigbluebuttonbn table to store meeting activity events*

<sub>defined in `public/mod/bigbluebuttonbn/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `courseid` | bigint(10) | NO |  | MUL |  |
| 3 | `bigbluebuttonbnid` | bigint(10) | NO |  |  |  |
| 4 | `userid` | bigint(10) | YES | `NULL` | MUL |  |
| 5 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 6 | `meetingid` | varchar(256) | NO | `''` |  |  |
| 7 | `log` | varchar(32) | NO | `''` | MUL |  |
| 8 | `meta` | longtext | YES | `NULL` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `courseid`
- **Index**: `log`
- **Index**: `courseid`, `bigbluebuttonbnid`, `userid`, `log`
- **Index**: `userid`, `log`
- **Index**: `courseid`, `bigbluebuttonbnid`

### bigbluebuttonbn_recordings

*The bigbluebuttonbn table to store references to recordings*

<sub>defined in `public/mod/bigbluebuttonbn/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `courseid` | bigint(10) | NO |  | MUL |  |
| 3 | `bigbluebuttonbnid` | bigint(10) | NO |  | MUL |  |
| 4 | `groupid` | bigint(10) | YES | `NULL` |  |  |
| 5 | `recordingid` | varchar(64) | NO | `''` | MUL |  |
| 6 | `headless` | tinyint(1) | NO | `0` |  |  |
| 7 | `imported` | tinyint(1) | NO | `0` |  |  |
| 8 | `status` | tinyint(1) | NO | `0` |  |  |
| 9 | `importeddata` | longtext | YES | `NULL` |  | This is the remote recording data stored as json and kept for future reference. |
| 10 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 11 | `usermodified` | bigint(10) | NO | `0` | MUL |  |
| 12 | `timemodified` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `bigbluebuttonbnid` → `bigbluebuttonbn`(`id`)
- **FK** `usermodified` → `user`(`id`)
- **Index**: `courseid`
- **Index**: `recordingid`

### block

*contains all installed blocks*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `name` | varchar(40) | NO | `''` | UNI |  |
| 3 | `cron` | bigint(10) | NO | `0` |  |  |
| 4 | `lastcron` | bigint(10) | NO | `0` |  |  |
| 5 | `visible` | tinyint(1) | NO | `1` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index** (unique): `name`

### block_instances

*This table stores block instances. The type of block this is is given by the blockname column. The places this block instance appears is controlled by the parentcontexid, showinsubcontexts, pagetypepattern and subpagepattern fields. Where the block appears on the page (by default) is controlled by the defaultposition and defaultweight columns. The block's own configuration is stored serialized in configdata.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `blockname` | varchar(40) | NO | `''` | MUL | The type of block this is. Foreign key, references block.name. |
| 3 | `parentcontextid` | bigint(10) | NO |  | MUL | The context within which this block appears. Foreign key, references context.id. |
| 4 | `showinsubcontexts` | smallint(4) | NO |  |  | If 1, this block appears on all matching pages in subcontexts of parentcontextid, as well in pages belonging to parentcontextid. |
| 5 | `requiredbytheme` | smallint(4) | NO | `0` |  | If 1, this block was created because it was required by the theme and did not exist. |
| 6 | `pagetypepattern` | varchar(64) | NO | `''` |  | The types of page this block appears on. Either an exact page type like mod-quiz-view, or a pattern like mod-quiz-* or course-view-*. Note that course-view-* will match course-view. |
| 7 | `subpagepattern` | varchar(16) | YES | `NULL` |  | Further restrictions on where this block appears. In some places, e.g. during a quiz or lesson attempt, different pages have different subpage ids. If this field is not null, the block only appears on that particular subpage. |
| 8 | `defaultregion` | varchar(16) | NO | `''` |  | Which block region this block should appear in on each page, in the absence of a specific position in the block_positions table. |
| 9 | `defaultweight` | bigint(10) | NO |  |  | Used to order the blocks within a block region. Again, may be overridden by the block_positions table for a specific page where this block appears. |
| 10 | `configdata` | longtext | YES | `NULL` |  | A serialized blob of configuration data for this block instance. |
| 11 | `timecreated` | bigint(10) | NO |  |  | Time at which this block instance was originally created |
| 12 | `timemodified` | bigint(10) | NO |  | MUL | Time at which block instance was last modified. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `parentcontextid` → `context`(`id`)
- **Index**: `parentcontextid`, `showinsubcontexts`, `pagetypepattern`, `subpagepattern`
- **Index**: `timemodified`
- **Index**: `blockname`

### block_positions

*Stores the position of a sticky block_instance on a another page than the one where it was added.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `blockinstanceid` | bigint(10) | NO |  | MUL | The block_instance this position relates to. |
| 3 | `contextid` | bigint(10) | NO |  | MUL | With pagetype and subpage, defines the page we are setting the position for. |
| 4 | `pagetype` | varchar(64) | NO | `''` |  | With contextid and subpage, defines the page we are setting the position for. |
| 5 | `subpage` | varchar(16) | NO | `''` |  | With contextid and pagetype, defines the page we are setting the position for. |
| 6 | `visible` | smallint(4) | NO |  |  | Whether this block instance is visible on this page. |
| 7 | `region` | varchar(16) | NO | `''` |  | Which block region on this page this block should appear in. |
| 8 | `weight` | bigint(10) | NO |  |  | Used to order the blocks within a block region. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `blockinstanceid` → `block_instances`(`id`)
- **FK** `contextid` → `context`(`id`)
- **Index** (unique): `blockinstanceid`, `contextid`, `pagetype`, `subpage`

### block_recent_activity

*Recent activity block*

<sub>defined in `public/blocks/recent_activity/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `courseid` | bigint(10) | NO |  | MUL | Course id |
| 3 | `cmid` | bigint(10) | NO |  |  | Course module id |
| 4 | `timecreated` | bigint(10) | NO |  |  |  |
| 5 | `userid` | bigint(10) | NO |  |  | User performing the action |
| 6 | `action` | tinyint(1) | NO |  |  | 0 created, 1 updated, 2 deleted |
| 7 | `modname` | varchar(20) | YES | `NULL` |  | module type name (for delete action) |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `courseid`, `timecreated`

### block_recentlyaccesseditems

*Most recently accessed items accessed by a user*

<sub>defined in `public/blocks/recentlyaccesseditems/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `courseid` | bigint(10) | NO |  | MUL | Course id the item belongs to |
| 3 | `cmid` | bigint(10) | NO |  | MUL | Item course module id |
| 4 | `userid` | bigint(10) | NO |  | MUL | User id that accessed the item |
| 5 | `timeaccess` | bigint(10) | NO |  |  | Time the user accessed the last time an item |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)
- **FK** `courseid` → `course`(`id`)
- **FK** `cmid` → `course_modules`(`id`)
- **Index** (unique): `userid`, `courseid`, `cmid`

### block_rss_client

*Remote news feed information. Contains the news feed id, the userid of the user who added the feed, the title of the feed itself and a description of the feed contents along with the url used to access the remote feed. Preferredtitle is a field for future use - intended to allow for custom titles rather than those found in the feed*

<sub>defined in `public/blocks/rss_client/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO | `0` |  |  |
| 3 | `title` | longtext | NO |  |  |  |
| 4 | `preferredtitle` | varchar(64) | NO | `''` |  |  |
| 5 | `description` | longtext | NO |  |  |  |
| 6 | `shared` | tinyint(2) | NO | `0` |  |  |
| 7 | `url` | varchar(255) | NO | `''` |  |  |
| 8 | `skiptime` | bigint(10) | NO | `0` |  | How many seconds skip this feed for (increases every time it fails, resets to 0 when it succeeds) |
| 9 | `skipuntil` | bigint(10) | NO | `0` |  | Do not query this RSS feed again until this time |

**Keys & indexes**

- **Primary key:** `id`

### blog_association

*Associations of blog entries with courses and module instances*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `contextid` | bigint(10) | NO |  | MUL |  |
| 3 | `blogid` | bigint(10) | NO |  | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `contextid` → `context`(`id`)
- **FK** `blogid` → `post`(`id`)

### blog_external

*External blog links used for RSS copying of blog entries to Moodle user blogs*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO |  | MUL |  |
| 3 | `name` | varchar(255) | NO | `''` |  |  |
| 4 | `description` | longtext | YES | `NULL` |  |  |
| 5 | `url` | longtext | NO |  |  |  |
| 6 | `filtertags` | varchar(255) | YES | `NULL` |  | Comma-separated list of tags that will be used to filter which entries are copied over from the external blog. They refer to existing tags in the external blog. |
| 7 | `failedlastsync` | tinyint(1) | NO | `0` |  | Whether or not the last sync failed for some reason |
| 8 | `timemodified` | bigint(10) | YES | `NULL` |  |  |
| 9 | `timefetched` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)

### book

*Defines book*

<sub>defined in `public/mod/book/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `course` | bigint(10) | NO | `0` | MUL |  |
| 3 | `name` | varchar(1333) | NO | `''` |  |  |
| 4 | `intro` | longtext | YES | `NULL` |  |  |
| 5 | `introformat` | smallint(4) | NO | `0` |  |  |
| 6 | `numbering` | smallint(4) | NO | `0` |  |  |
| 7 | `navstyle` | smallint(4) | NO | `1` |  |  |
| 8 | `customtitles` | tinyint(2) | NO | `0` |  |  |
| 9 | `revision` | bigint(10) | NO | `0` |  |  |
| 10 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 11 | `timemodified` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `course` → `course`(`id`)

### book_chapters

*Defines book_chapters*

<sub>defined in `public/mod/book/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `bookid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `pagenum` | bigint(10) | NO | `0` |  |  |
| 4 | `subchapter` | bigint(10) | NO | `0` |  |  |
| 5 | `title` | varchar(1333) | NO | `''` |  |  |
| 6 | `content` | longtext | NO |  |  |  |
| 7 | `contentformat` | smallint(4) | NO | `0` |  |  |
| 8 | `hidden` | tinyint(2) | NO | `0` |  |  |
| 9 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 10 | `timemodified` | bigint(10) | NO | `0` |  |  |
| 11 | `importsrc` | varchar(255) | NO | `''` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `bookid`

### cache_filters

*For keeping information about cached data*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `filter` | varchar(32) | NO | `''` | MUL |  |
| 3 | `version` | bigint(10) | NO | `0` |  |  |
| 4 | `md5key` | varchar(32) | NO | `''` |  |  |
| 5 | `rawtext` | longtext | NO |  |  |  |
| 6 | `timemodified` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `filter`, `md5key`

### cache_flags

*Cache of time-sensitive flags*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `flagtype` | varchar(255) | NO | `''` | MUL |  |
| 3 | `name` | varchar(255) | NO | `''` | MUL |  |
| 4 | `timemodified` | bigint(10) | NO | `0` |  |  |
| 5 | `value` | longtext | NO |  |  |  |
| 6 | `expiry` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `flagtype`
- **Index**: `name`

### capabilities

*this defines all capabilities*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `name` | varchar(255) | NO | `''` | UNI |  |
| 3 | `captype` | varchar(50) | NO | `''` |  |  |
| 4 | `contextlevel` | bigint(10) | NO | `0` |  |  |
| 5 | `component` | varchar(100) | NO | `''` |  |  |
| 6 | `riskbitmask` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Unique:** `name`

### choice

*Available choices are stored here*

<sub>defined in `public/mod/choice/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `course` | bigint(10) | NO | `0` | MUL |  |
| 3 | `name` | varchar(1333) | NO | `''` |  |  |
| 4 | `intro` | longtext | NO |  |  |  |
| 5 | `introformat` | smallint(4) | NO | `0` |  |  |
| 6 | `publish` | tinyint(2) | NO | `0` |  |  |
| 7 | `showresults` | tinyint(2) | NO | `0` |  |  |
| 8 | `display` | smallint(4) | NO | `0` |  |  |
| 9 | `allowupdate` | tinyint(2) | NO | `0` |  |  |
| 10 | `allowmultiple` | tinyint(2) | NO | `0` |  |  |
| 11 | `showunanswered` | tinyint(2) | NO | `0` |  |  |
| 12 | `includeinactive` | tinyint(2) | NO | `1` |  |  |
| 13 | `limitanswers` | tinyint(2) | NO | `0` |  |  |
| 14 | `timeopen` | bigint(10) | NO | `0` |  |  |
| 15 | `timeclose` | bigint(10) | NO | `0` |  |  |
| 16 | `showpreview` | tinyint(2) | NO | `0` |  |  |
| 17 | `timemodified` | bigint(10) | NO | `0` |  |  |
| 18 | `completionsubmit` | tinyint(1) | NO | `0` |  | If this field is set to 1, then the activity will be automatically marked as 'complete' once the user submits their choice. |
| 19 | `showavailable` | tinyint(1) | NO | `0` |  | If this field is set to 1, then the the number of available space on choice options will be shown, given limitanswers is set to 1. |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `course`

### choice_answers

*choices performed by users*

<sub>defined in `public/mod/choice/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `choiceid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `userid` | bigint(10) | NO | `0` | MUL |  |
| 4 | `optionid` | bigint(10) | NO | `0` | MUL |  |
| 5 | `timemodified` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `choiceid` → `choice`(`id`)
- **FK** `optionid` → `choice_options`(`id`)
- **Index**: `userid`

### choice_options

*available options to choice*

<sub>defined in `public/mod/choice/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `choiceid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `text` | longtext | YES | `NULL` |  |  |
| 4 | `maxanswers` | bigint(10) | YES | `0` |  |  |
| 5 | `timemodified` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `choiceid` → `choice`(`id`)

### cohort

*Each record represents one cohort (aka site-wide group).*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `contextid` | bigint(10) | NO |  | MUL | Context is usually ignored in sync operations so that the cohorts may be moved freely around in the context tree without any side affects. |
| 3 | `name` | varchar(254) | NO | `''` |  | Short human readable name for the cohort, does not have to be unique |
| 4 | `idnumber` | varchar(100) | YES | `NULL` |  | Unique identifier of a cohort, useful especially for mapping to external entities |
| 5 | `description` | longtext | YES | `NULL` |  | Standard description text box |
| 6 | `descriptionformat` | tinyint(2) | NO |  |  |  |
| 7 | `visible` | tinyint(1) | NO | `1` |  | Visibility to teachers |
| 8 | `component` | varchar(100) | NO | `''` |  | Component (plugintype_pluignname) that manages the cohort, manual modifications are allowed only when set to NULL |
| 9 | `timecreated` | bigint(10) | NO |  |  |  |
| 10 | `timemodified` | bigint(10) | NO |  |  |  |
| 11 | `theme` | varchar(50) | YES | `NULL` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `contextid` → `context`(`id`)

### cohort_members

*Link a user to a cohort.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `cohortid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `userid` | bigint(10) | NO | `0` | MUL |  |
| 4 | `timeadded` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `cohortid` → `cohort`(`id`)
- **FK** `userid` → `user`(`id`)
- **Index** (unique): `cohortid`, `userid`

### comments

*moodle comments module*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `contextid` | bigint(10) | NO |  | MUL |  |
| 3 | `component` | varchar(255) | YES | `NULL` |  | The plugin this comment belongs to. |
| 4 | `commentarea` | varchar(255) | NO | `''` |  |  |
| 5 | `itemid` | bigint(10) | NO |  |  |  |
| 6 | `content` | longtext | NO |  |  |  |
| 7 | `format` | tinyint(2) | NO | `0` |  |  |
| 8 | `userid` | bigint(10) | NO |  | MUL |  |
| 9 | `timecreated` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)
- **Index**: `contextid`, `commentarea`, `itemid`

### communication

*Communication records*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `contextid` | bigint(10) | NO |  | MUL | The id of the context that this communication instance relates to |
| 3 | `instanceid` | bigint(10) | NO |  |  | ID of the instance where the communication is a part of |
| 4 | `component` | varchar(100) | NO | `''` |  | Component of the instance where the communication room is a part of |
| 5 | `instancetype` | varchar(100) | NO | `''` |  | The type of the instance for the given component |
| 6 | `provider` | varchar(100) | NO | `''` |  | Name of the selected communication provider |
| 7 | `roomname` | varchar(255) | YES | `NULL` |  | Name of the communication room |
| 8 | `avatarfilename` | varchar(100) | YES | `NULL` |  | Name of the avatar file name for the communication instance |
| 9 | `active` | tinyint(1) | NO | `1` |  | The communication instance is active or not |
| 10 | `avatarsynced` | tinyint(1) | NO | `0` |  | Indicate if the avatar has been synced with the provider |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `contextid` → `context`(`id`)

### communication_customlink

*Stores the link associated with a custom link communication instance.*

<sub>defined in `public/communication/provider/customlink/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `commid` | bigint(10) | NO |  | MUL | ID of the communication record |
| 3 | `url` | varchar(255) | YES | `NULL` |  | URL being linked to by the provider |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `commid` → `communication`(`id`)

### communication_user

*Communication user records mapping*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `commid` | bigint(10) | NO |  | MUL | ID of the communication instance |
| 3 | `userid` | bigint(10) | NO |  | MUL | ID of the moodle user to map with communication instance |
| 4 | `synced` | tinyint(1) | NO | `0` |  | The user is synced or not |
| 5 | `deleted` | tinyint(1) | NO | `0` |  | The user need to be deleted or not |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `commid` → `communication`(`id`)
- **FK** `userid` → `user`(`id`)

### competency

*This table contains the master record of each competency in a framework*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `shortname` | varchar(100) | YES | `NULL` |  | Shortname of a competency |
| 3 | `description` | longtext | YES | `NULL` |  | Description of a single competency |
| 4 | `descriptionformat` | smallint(4) | NO | `0` |  | The format of the description field |
| 5 | `idnumber` | varchar(100) | YES | `NULL` |  |  |
| 6 | `competencyframeworkid` | bigint(10) | NO |  | MUL | The framework this competency relates to. |
| 7 | `parentid` | bigint(10) | NO | `0` |  | The parent competency. |
| 8 | `path` | varchar(255) | NO | `''` |  | Used to speed up queries that use an entire branch of the tree. Looks like /5/34/54. |
| 9 | `sortorder` | bigint(10) | NO |  |  | Relative sort order within the branch |
| 10 | `ruletype` | varchar(100) | YES | `NULL` |  |  |
| 11 | `ruleoutcome` | tinyint(2) | NO | `0` | MUL |  |
| 12 | `ruleconfig` | longtext | YES | `NULL` |  |  |
| 13 | `scaleid` | bigint(10) | YES | `NULL` | MUL |  |
| 14 | `scaleconfiguration` | longtext | YES | `NULL` |  |  |
| 15 | `timecreated` | bigint(10) | NO |  |  | The time this competency was created. |
| 16 | `timemodified` | bigint(10) | NO |  |  | The time this competency was last modified. |
| 17 | `usermodified` | bigint(10) | YES | `NULL` | MUL | The user who last modified this competency |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `scaleid` → `scale`(`id`)
- **FK** `usermodified` → `user`(`id`)
- **Index** (unique): `competencyframeworkid`, `idnumber`
- **Index**: `ruleoutcome`

### competency_coursecomp

*Link a competency to a course.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `courseid` | bigint(10) | NO |  | MUL | The course this competency is linked to. |
| 3 | `competencyid` | bigint(10) | NO |  | MUL | The competency that is linked to this course. |
| 4 | `ruleoutcome` | tinyint(2) | NO |  |  | The rule that applies to the competency when the course is completed. |
| 5 | `timecreated` | bigint(10) | NO |  |  | The time this link was created. |
| 6 | `timemodified` | bigint(10) | NO |  |  | The time this link was modified. |
| 7 | `usermodified` | bigint(10) | NO |  | MUL | The user who modified this link. |
| 8 | `sortorder` | bigint(10) | NO |  |  | The display order for this link. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `courseid` → `course`(`id`)
- **FK** `competencyid` → `competency`(`id`)
- **FK** `usermodified` → `user`(`id`)
- **Index**: `courseid`, `ruleoutcome`
- **Index** (unique): `courseid`, `competencyid`

### competency_coursecompsetting

*This table contains the course specific settings for competencies.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `courseid` | bigint(10) | NO |  | UNI | The course this setting is linked to. |
| 3 | `pushratingstouserplans` | tinyint(2) | YES | `NULL` |  | Does this course push ratings to user plans? |
| 4 | `timecreated` | bigint(10) | NO |  |  | The time this setting was created. |
| 5 | `timemodified` | bigint(10) | NO |  |  | The time this setting was last modified. |
| 6 | `usermodified` | bigint(10) | YES | `NULL` | MUL | The user who last modified this setting |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `courseid` → `course`(`id`) *(unique)*
- **FK** `usermodified` → `user`(`id`)

### competency_evidence

*The evidence linked to a user competency*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `usercompetencyid` | bigint(10) | NO |  | MUL |  |
| 3 | `contextid` | bigint(10) | NO |  | MUL |  |
| 4 | `action` | tinyint(2) | NO |  |  |  |
| 5 | `actionuserid` | bigint(10) | YES | `NULL` | MUL |  |
| 6 | `descidentifier` | varchar(255) | NO | `''` |  |  |
| 7 | `desccomponent` | varchar(255) | NO | `''` |  |  |
| 8 | `desca` | longtext | YES | `NULL` |  |  |
| 9 | `url` | varchar(255) | YES | `NULL` |  |  |
| 10 | `grade` | bigint(10) | YES | `NULL` |  |  |
| 11 | `note` | longtext | YES | `NULL` |  | A non-localised text to attach to the evidence. |
| 12 | `timecreated` | bigint(10) | NO |  |  |  |
| 13 | `timemodified` | bigint(10) | NO |  |  |  |
| 14 | `usermodified` | bigint(10) | NO |  | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `contextid` → `context`(`id`)
- **FK** `actionuserid` → `user`(`id`)
- **FK** `usermodified` → `user`(`id`)
- **Index**: `usercompetencyid`

### competency_framework

*List of competency frameworks.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `shortname` | varchar(100) | YES | `NULL` |  | Short name for the competency framework. |
| 3 | `contextid` | bigint(10) | NO |  | MUL |  |
| 4 | `idnumber` | varchar(100) | YES | `NULL` | UNI | Unique idnumber for this competency framework. |
| 5 | `description` | longtext | YES | `NULL` |  | Description of this competency framework |
| 6 | `descriptionformat` | smallint(4) | NO | `0` |  | The format of the description field |
| 7 | `scaleid` | bigint(11) | YES | `NULL` | MUL | Scale used to define competency. |
| 8 | `scaleconfiguration` | longtext | NO |  |  | Scale information. |
| 9 | `visible` | tinyint(2) | NO | `1` |  | Used to show/hide this competency framework. |
| 10 | `taxonomies` | varchar(255) | NO | `''` |  | Sequence of terms to use for each competency level. |
| 11 | `timecreated` | bigint(10) | NO |  |  | The time this competency framework was created. |
| 12 | `timemodified` | bigint(10) | NO |  |  | The time this competency framework was last modified. |
| 13 | `usermodified` | bigint(10) | YES | `NULL` | MUL | The user who last modified this framework |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `contextid` → `context`(`id`)
- **FK** `scaleid` → `scale`(`id`)
- **FK** `usermodified` → `user`(`id`)
- **Index** (unique): `idnumber`

### competency_modulecomp

*Link a competency to a module.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `cmid` | bigint(10) | NO |  | MUL | ID of the record in the course_modules table. |
| 3 | `timecreated` | bigint(10) | NO |  |  | The time this record was created. |
| 4 | `timemodified` | bigint(10) | NO |  |  | The time this record was last modified |
| 5 | `usermodified` | bigint(10) | NO |  | MUL | The user who last modified this field. |
| 6 | `sortorder` | bigint(10) | NO |  |  | The field used to naturally sort this link. |
| 7 | `competencyid` | bigint(10) | NO |  | MUL | The course competency this activity is linked to. |
| 8 | `ruleoutcome` | tinyint(2) | NO |  |  | The outcome when an activity is completed. |
| 9 | `overridegrade` | tinyint(1) | NO | `0` |  | Enables the ability to override an existing competencys grade. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `cmid` → `course_modules`(`id`)
- **FK** `competencyid` → `competency`(`id`)
- **FK** `usermodified` → `user`(`id`)
- **Index**: `cmid`, `ruleoutcome`
- **Index** (unique): `cmid`, `competencyid`

### competency_plan

*Learning plans*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `name` | varchar(100) | NO | `''` |  |  |
| 3 | `description` | longtext | YES | `NULL` |  |  |
| 4 | `descriptionformat` | smallint(4) | NO | `0` |  |  |
| 5 | `userid` | bigint(10) | NO |  | MUL |  |
| 6 | `templateid` | bigint(10) | YES | `NULL` | MUL |  |
| 7 | `origtemplateid` | bigint(10) | YES | `NULL` |  | The template ID this plan was based on originally |
| 8 | `status` | tinyint(1) | NO |  | MUL |  |
| 9 | `duedate` | bigint(10) | YES | `0` |  |  |
| 10 | `reviewerid` | bigint(10) | YES | `NULL` |  |  |
| 11 | `timecreated` | bigint(10) | NO |  |  |  |
| 12 | `timemodified` | bigint(10) | NO | `0` |  |  |
| 13 | `usermodified` | bigint(10) | NO |  | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `usermodified` → `user`(`id`)
- **Index**: `userid`, `status`
- **Index**: `templateid`
- **Index**: `status`, `duedate`

### competency_plancomp

*Plan competencies*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `planid` | bigint(10) | NO |  | MUL |  |
| 3 | `competencyid` | bigint(10) | NO |  |  |  |
| 4 | `sortorder` | bigint(10) | YES | `NULL` |  | Relative sort order |
| 5 | `timecreated` | bigint(10) | NO |  |  |  |
| 6 | `timemodified` | bigint(10) | YES | `NULL` |  |  |
| 7 | `usermodified` | bigint(10) | NO |  | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `usermodified` → `user`(`id`)
- **Index** (unique): `planid`, `competencyid`

### competency_relatedcomp

*Related competencies*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `competencyid` | bigint(10) | NO |  | MUL |  |
| 3 | `relatedcompetencyid` | bigint(10) | NO |  | MUL |  |
| 4 | `timecreated` | bigint(10) | NO |  |  |  |
| 5 | `timemodified` | bigint(10) | YES | `NULL` |  |  |
| 6 | `usermodified` | bigint(10) | NO |  | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `competencyid` → `competency`(`id`)
- **FK** `relatedcompetencyid` → `competency`(`id`)
- **FK** `usermodified` → `user`(`id`)

### competency_template

*Learning plan templates.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `shortname` | varchar(100) | YES | `NULL` |  | Short name for the learning plan template. |
| 3 | `contextid` | bigint(10) | NO |  | MUL |  |
| 4 | `description` | longtext | YES | `NULL` |  | Description of this learning plan template |
| 5 | `descriptionformat` | smallint(4) | NO | `0` |  | The format of the description field |
| 6 | `visible` | tinyint(2) | NO | `1` |  | Used to show/hide this learning plan template. |
| 7 | `duedate` | bigint(10) | YES | `NULL` |  | The default due date for instances of this plan. |
| 8 | `timecreated` | bigint(10) | NO |  |  | The time this learning plan template was created. |
| 9 | `timemodified` | bigint(10) | NO |  |  | The time this learning plan template was last modified. |
| 10 | `usermodified` | bigint(10) | YES | `NULL` | MUL | The user who last modified this learning plan template |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `contextid` → `context`(`id`)
- **FK** `usermodified` → `user`(`id`)

### competency_templatecohort

*Default comment for the table, please edit me*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `templateid` | bigint(10) | NO |  | MUL |  |
| 3 | `cohortid` | bigint(10) | NO |  |  |  |
| 4 | `timecreated` | bigint(10) | NO |  |  |  |
| 5 | `timemodified` | bigint(10) | NO |  |  |  |
| 6 | `usermodified` | bigint(10) | NO |  | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `usermodified` → `user`(`id`)
- **Index**: `templateid`
- **Index** (unique): `templateid`, `cohortid`

### competency_templatecomp

*Link a competency to a learning plan template.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `templateid` | bigint(10) | NO |  | MUL | The template this competency is linked to. |
| 3 | `competencyid` | bigint(10) | NO |  | MUL | The competency that is linked to this course. |
| 4 | `timecreated` | bigint(10) | NO |  |  | The time this link was created. |
| 5 | `timemodified` | bigint(10) | NO |  |  | The time this link was modified. |
| 6 | `usermodified` | bigint(10) | NO |  | MUL | The user who modified this link. |
| 7 | `sortorder` | bigint(10) | YES | `NULL` |  | Relative sort order |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `templateid` → `competency_template`(`id`)
- **FK** `competencyid` → `competency`(`id`)
- **FK** `usermodified` → `user`(`id`)

### competency_usercomp

*User competencies*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO |  | MUL | User associated to the competency. |
| 3 | `competencyid` | bigint(10) | NO |  |  | Competency associated to the user. |
| 4 | `status` | tinyint(2) | NO | `0` |  | Competency status. |
| 5 | `reviewerid` | bigint(10) | YES | `NULL` |  | User that reviewed the competency. |
| 6 | `proficiency` | tinyint(2) | YES | `NULL` |  | Indicate if the competency is proficient not. |
| 7 | `grade` | bigint(10) | YES | `NULL` |  | Grade assigned to the competency. |
| 8 | `timecreated` | bigint(10) | NO |  |  |  |
| 9 | `timemodified` | bigint(10) | YES | `NULL` |  |  |
| 10 | `usermodified` | bigint(10) | NO |  | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `usermodified` → `user`(`id`)
- **Index** (unique): `userid`, `competencyid`

### competency_usercompcourse

*User competencies in a course*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO |  | MUL | User associated to the competency. |
| 3 | `courseid` | bigint(10) | NO |  |  | The course this competency is linked to. |
| 4 | `competencyid` | bigint(10) | NO |  |  | Competency associated to the user. |
| 5 | `proficiency` | tinyint(2) | YES | `NULL` |  | Indicate if the competency is proficient not. |
| 6 | `grade` | bigint(10) | YES | `NULL` |  | The course grade assigned for the competency. |
| 7 | `timecreated` | bigint(10) | NO |  |  |  |
| 8 | `timemodified` | bigint(10) | YES | `NULL` |  |  |
| 9 | `usermodified` | bigint(10) | NO |  | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `usermodified` → `user`(`id`)
- **Index** (unique): `userid`, `courseid`, `competencyid`

### competency_usercompplan

*User competencies plans*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO |  | MUL | User associated to the competency. |
| 3 | `competencyid` | bigint(10) | NO |  |  | Competency associated to the user. |
| 4 | `planid` | bigint(10) | NO |  |  | Plan associated to the user. |
| 5 | `proficiency` | tinyint(2) | YES | `NULL` |  | Indicate if the competency is proficient not. |
| 6 | `grade` | bigint(10) | YES | `NULL` |  | Grade assigned to the competency. |
| 7 | `sortorder` | bigint(10) | YES | `NULL` |  | Relative sort order |
| 8 | `timecreated` | bigint(10) | NO |  |  |  |
| 9 | `timemodified` | bigint(10) | YES | `NULL` |  |  |
| 10 | `usermodified` | bigint(10) | NO |  | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `usermodified` → `user`(`id`)
- **Index** (unique): `userid`, `competencyid`, `planid`

### competency_userevidence

*The evidence of prior learning*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO |  | MUL |  |
| 3 | `name` | varchar(100) | NO | `''` |  |  |
| 4 | `description` | longtext | NO |  |  |  |
| 5 | `descriptionformat` | tinyint(1) | NO |  |  |  |
| 6 | `url` | longtext | NO |  |  |  |
| 7 | `timecreated` | bigint(10) | NO |  |  |  |
| 8 | `timemodified` | bigint(10) | NO |  |  |  |
| 9 | `usermodified` | bigint(10) | NO |  | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `usermodified` → `user`(`id`)
- **Index**: `userid`

### competency_userevidencecomp

*Relationship between user evidence and competencies*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userevidenceid` | bigint(10) | NO |  | MUL |  |
| 3 | `competencyid` | bigint(10) | NO |  |  |  |
| 4 | `timecreated` | bigint(10) | NO |  |  |  |
| 5 | `timemodified` | bigint(10) | NO |  |  |  |
| 6 | `usermodified` | bigint(10) | NO |  | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `usermodified` → `user`(`id`)
- **Index**: `userevidenceid`
- **Index** (unique): `userevidenceid`, `competencyid`

### config

*Moodle configuration variables*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `name` | varchar(255) | NO | `''` | UNI |  |
| 3 | `value` | longtext | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Unique:** `name`

### config_log

*Changes done in server configuration through admin UI*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO |  | MUL |  |
| 3 | `timemodified` | bigint(10) | NO |  | MUL |  |
| 4 | `plugin` | varchar(100) | YES | `NULL` |  |  |
| 5 | `name` | varchar(100) | NO | `''` |  |  |
| 6 | `value` | longtext | YES | `NULL` |  |  |
| 7 | `oldvalue` | longtext | YES | `NULL` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)
- **Index**: `timemodified`

### config_plugins

*Moodle modules and plugins configuration variables*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `plugin` | varchar(100) | NO | `'core'` | MUL |  |
| 3 | `name` | varchar(100) | NO | `''` |  |  |
| 4 | `value` | longtext | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Unique:** `plugin`, `name`

### contentbank_content

*This table stores content data in the content bank.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `name` | varchar(255) | NO | `''` | MUL |  |
| 3 | `contenttype` | varchar(100) | NO | `''` |  |  |
| 4 | `contextid` | bigint(10) | NO |  | MUL | References context.id. |
| 5 | `visibility` | tinyint(1) | NO | `1` |  |  |
| 6 | `instanceid` | bigint(10) | YES | `NULL` |  |  |
| 7 | `configdata` | longtext | YES | `NULL` |  |  |
| 8 | `usercreated` | bigint(10) | NO |  | MUL | The original author of the content |
| 9 | `usermodified` | bigint(10) | YES | `NULL` | MUL |  |
| 10 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 11 | `timemodified` | bigint(10) | YES | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `contextid` → `context`(`id`)
- **FK** `usermodified` → `user`(`id`)
- **FK** `usercreated` → `user`(`id`)
- **Index**: `name`
- **Index**: `contextid`, `contenttype`, `instanceid`

### context

*one of these must be set*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `contextlevel` | bigint(10) | NO | `0` | MUL |  |
| 3 | `instanceid` | bigint(10) | NO | `0` | MUL |  |
| 4 | `path` | varchar(255) | YES | `NULL` | MUL |  |
| 5 | `depth` | tinyint(2) | NO | `0` |  |  |
| 6 | `locked` | tinyint(2) | NO | `0` |  | Whether this context and its children are locked |

**Keys & indexes**

- **Primary key:** `id`
- **Index** (unique): `contextlevel`, `instanceid`
- **Index**: `instanceid`
- **Index**: `path`

### context_temp

*Used by build_context_path() in upgrade and cron to keep context depths and paths in sync.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | This id isn't autonumeric/sequence. It's the context->id |
| 2 | `path` | varchar(255) | NO | `''` |  |  |
| 3 | `depth` | tinyint(2) | NO |  |  |  |
| 4 | `locked` | tinyint(2) | NO | `0` |  | Whether this context and its children are locked |

**Keys & indexes**

- **Primary key:** `id`

### course

*Central course table*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `category` | bigint(10) | NO | `0` | MUL |  |
| 3 | `sortorder` | bigint(10) | NO | `0` | MUL |  |
| 4 | `fullname` | varchar(1333) | NO | `''` |  |  |
| 5 | `shortname` | varchar(255) | NO | `''` | MUL |  |
| 6 | `idnumber` | varchar(100) | NO | `''` | MUL |  |
| 7 | `summary` | longtext | YES | `NULL` |  |  |
| 8 | `summaryformat` | tinyint(2) | NO | `0` |  |  |
| 9 | `format` | varchar(21) | NO | `'topics'` |  |  |
| 10 | `showgrades` | tinyint(2) | NO | `1` |  |  |
| 11 | `newsitems` | mediumint(5) | NO | `1` |  |  |
| 12 | `startdate` | bigint(10) | NO | `0` |  |  |
| 13 | `enddate` | bigint(10) | NO | `0` |  |  |
| 14 | `relativedatesmode` | tinyint(1) | NO | `0` |  | Whether to let this course display course- or activity-related dates relative to the user's enrolment date in this course. |
| 15 | `marker` | bigint(10) | NO | `0` |  |  |
| 16 | `maxbytes` | bigint(10) | NO | `0` |  |  |
| 17 | `legacyfiles` | smallint(4) | NO | `0` |  | course files are not necessary any more: 0 no legacy files, 1 legacy files disabled, 2 legacy files enabled |
| 18 | `showreports` | smallint(4) | NO | `0` |  |  |
| 19 | `visible` | tinyint(1) | NO | `1` |  |  |
| 20 | `visibleold` | tinyint(1) | NO | `1` |  | the state of visible field when hiding parent category, this helps us to recover hidden states when unhiding the parent category later |
| 21 | `downloadcontent` | tinyint(1) | YES | `NULL` |  |  |
| 22 | `groupmode` | smallint(4) | NO | `0` |  |  |
| 23 | `groupmodeforce` | smallint(4) | NO | `0` |  |  |
| 24 | `defaultgroupingid` | bigint(10) | NO | `0` |  | default grouping used in course modules, does not have key intentionally |
| 25 | `lang` | varchar(30) | NO | `''` |  | Forced language for this course. Null or '' means 'Do not force'. Otherwise a Moodle lang pack name like 'fr' or 'en_us'. |
| 26 | `calendartype` | varchar(30) | NO | `''` |  |  |
| 27 | `theme` | varchar(50) | NO | `''` |  |  |
| 28 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 29 | `timemodified` | bigint(10) | NO | `0` |  |  |
| 30 | `requested` | tinyint(1) | NO | `0` |  |  |
| 31 | `enablecompletion` | tinyint(1) | NO | `0` |  | 1 = allow use of 'completion' progress-tracking on this course. 0 = disable completion tracking on this course. |
| 32 | `completionnotify` | tinyint(1) | NO | `0` |  | Notify users when they complete this course |
| 33 | `cacherev` | bigint(10) | NO | `0` |  | Incrementing revision for validating the course content cache |
| 34 | `originalcourseid` | bigint(10) | YES | `NULL` | MUL | the id of the source course when a new course originates from a restore of another course on the same site. |
| 35 | `showactivitydates` | tinyint(1) | NO | `1` |  | Whether to display activity dates to user. 0 = do not display, 1 = display activity dates |
| 36 | `showcompletionconditions` | tinyint(1) | YES | `NULL` |  | Whether to display completion conditions to user. 0 = do not display, 1 = display conditions |
| 37 | `pdfexportfont` | varchar(50) | YES | `NULL` |  |  |
| 38 | `enableaitools` | tinyint(1) | YES | `NULL` |  | Whether to allow the use of AI tools in this course. 1 = enabled, 0 = disabled. |
| 39 | `deletioninprogress` | tinyint(1) | YES | `NULL` |  | Whether the course is marked for asynchronous deletion |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `originalcourseid` → `course`(`id`)
- **Index**: `category`
- **Index**: `idnumber`
- **Index**: `shortname`
- **Index**: `sortorder`

### course_categories

*Course categories*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `name` | varchar(255) | NO | `''` |  |  |
| 3 | `idnumber` | varchar(100) | YES | `NULL` |  |  |
| 4 | `description` | longtext | YES | `NULL` |  |  |
| 5 | `descriptionformat` | tinyint(2) | NO | `0` |  |  |
| 6 | `parent` | bigint(10) | NO | `0` | MUL |  |
| 7 | `sortorder` | bigint(10) | NO | `0` |  |  |
| 8 | `coursecount` | bigint(10) | NO | `0` |  |  |
| 9 | `visible` | tinyint(1) | NO | `1` |  |  |
| 10 | `visibleold` | tinyint(1) | NO | `1` |  | the state of visible field when hiding parent category, this helps us to recover hidden states when unhiding the parent category later |
| 11 | `timemodified` | bigint(10) | NO | `0` |  |  |
| 12 | `depth` | bigint(10) | NO | `0` |  |  |
| 13 | `path` | varchar(255) | NO | `''` |  |  |
| 14 | `theme` | varchar(50) | YES | `NULL` |  | Theme for the category |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `parent` → `course_categories`(`id`)

### course_completion_aggr_methd

*Course completion aggregation methods for criteria*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `course` | bigint(10) | NO | `0` | MUL |  |
| 3 | `criteriatype` | bigint(10) | YES | `NULL` | MUL | The criteria type we are aggregating, or NULL if complete course aggregation |
| 4 | `method` | tinyint(1) | NO | `0` |  | 1 = all, 2 = any, 3 = fraction, 4 = unit |
| 5 | `value` | decimal(10,5) | YES | `NULL` |  | NULL = all/any, 0..1 for method 'fraction', > 0 for method 'unit' |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `course`
- **Index**: `criteriatype`
- **Index** (unique): `course`, `criteriatype`

### course_completion_crit_compl

*Course completion user records*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `course` | bigint(10) | NO | `0` | MUL |  |
| 4 | `criteriaid` | bigint(10) | NO | `0` | MUL | Completion criteria this references |
| 5 | `gradefinal` | decimal(10,5) | YES | `NULL` |  | The final grade for the course (included regardless of whether a passing grade was required) |
| 6 | `unenroled` | bigint(10) | YES | `NULL` |  | Timestamp when the user was unenroled |
| 7 | `timecompleted` | bigint(10) | YES | `NULL` | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `userid`
- **Index**: `course`
- **Index**: `criteriaid`
- **Index**: `timecompleted`
- **Index** (unique): `userid`, `course`, `criteriaid`

### course_completion_criteria

*Course completion criteria*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `course` | bigint(10) | NO | `0` | MUL |  |
| 3 | `criteriatype` | bigint(10) | NO | `0` |  | Type of criteria |
| 4 | `module` | varchar(100) | YES | `NULL` |  | Type of module (if using module criteria type) |
| 5 | `moduleinstance` | bigint(10) | YES | `NULL` |  | Course module id (if using module criteria type) |
| 6 | `courseinstance` | bigint(10) | YES | `NULL` |  | Course instance id (if using course criteria type) |
| 7 | `enrolperiod` | bigint(10) | YES | `NULL` |  | Number of days after enrolment the course is completed (if using enrolperiod criteria type) |
| 8 | `timeend` | bigint(10) | YES | `NULL` |  | Timestamp of the date for course completion (if using date criteria type) |
| 9 | `gradepass` | decimal(10,5) | YES | `NULL` |  | The minimum grade needed to pass the course (if passing grade criteria enabled) |
| 10 | `role` | bigint(10) | YES | `NULL` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `course`

### course_completion_defaults

*Default settings for activities completion*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `course` | bigint(10) | NO |  | MUL |  |
| 3 | `module` | bigint(10) | NO |  | MUL |  |
| 4 | `completion` | tinyint(1) | NO | `0` |  |  |
| 5 | `completionview` | tinyint(1) | NO | `0` |  |  |
| 6 | `completionusegrade` | tinyint(1) | NO | `0` |  |  |
| 7 | `completionpassgrade` | tinyint(1) | NO | `0` |  |  |
| 8 | `completionexpected` | bigint(10) | NO | `0` |  |  |
| 9 | `customrules` | longtext | YES | `NULL` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `module` → `modules`(`id`)
- **FK** `course` → `course`(`id`)
- **Index** (unique): `course`, `module`

### course_completions

*Course completion records*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `course` | bigint(10) | NO | `0` | MUL |  |
| 4 | `timeenrolled` | bigint(10) | NO | `0` |  |  |
| 5 | `timestarted` | bigint(10) | NO | `0` |  |  |
| 6 | `timecompleted` | bigint(10) | YES | `NULL` | MUL |  |
| 7 | `reaggregate` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `userid`
- **Index**: `course`
- **Index**: `timecompleted`
- **Index** (unique): `userid`, `course`

### course_format_options

*Stores format-specific options for the course or course section*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `courseid` | bigint(10) | NO |  | MUL | Id of the course |
| 3 | `format` | varchar(21) | NO | `''` |  | Format this option is for |
| 4 | `sectionid` | bigint(10) | NO | `0` |  | Null if this is a course option, otherwise id of the section this option is for |
| 5 | `name` | varchar(100) | NO | `''` |  | Name of the format option |
| 6 | `value` | longtext | YES | `NULL` |  | Value of the format option |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `courseid` → `course`(`id`)
- **Index** (unique): `courseid`, `format`, `sectionid`, `name`

### course_modules

*course_modules table retrofitted from MySQL*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `course` | bigint(10) | NO | `0` | MUL |  |
| 3 | `module` | bigint(10) | NO | `0` | MUL |  |
| 4 | `instance` | bigint(10) | NO | `0` | MUL |  |
| 5 | `section` | bigint(10) | NO | `0` |  |  |
| 6 | `idnumber` | varchar(100) | YES | `NULL` | MUL | customizable idnumber |
| 7 | `added` | bigint(10) | NO | `0` |  |  |
| 8 | `score` | smallint(4) | NO | `0` |  |  |
| 9 | `indent` | mediumint(5) | NO | `0` |  |  |
| 10 | `visible` | tinyint(1) | NO | `1` | MUL |  |
| 11 | `visibleoncoursepage` | tinyint(1) | NO | `1` |  | If stealth visibility is allowed for the course, this controls whether activity is visible on course page |
| 12 | `visibleold` | tinyint(1) | NO | `1` |  |  |
| 13 | `groupmode` | smallint(4) | NO | `0` |  |  |
| 14 | `groupingid` | bigint(10) | NO | `0` | MUL |  |
| 15 | `completion` | tinyint(1) | NO | `0` |  | Whether the completion-tracking facilities are enabled for this activity. 0 = not enabled (database default) 1 = manual tracking, user can tick this activity off (UI default for most activity types) 2 = automatic tracking, system should mark completion according to rules specified in course_moduleS_completion |
| 16 | `completiongradeitemnumber` | bigint(10) | YES | `NULL` |  | Grade-item number used to track automatic completion, if applicable. |
| 17 | `completionview` | tinyint(1) | NO | `0` |  | Controls whether a page view is part of the automatic completion requirements for this activity. 0 = view not required 1 = view required |
| 18 | `completionexpected` | bigint(10) | NO | `0` |  | Date at which students are expected to complete this activity. This field is used when displaying student progress. |
| 19 | `completionpassgrade` | tinyint(1) | NO | `0` |  | Enable completion check on passing grade. |
| 20 | `showdescription` | tinyint(1) | NO | `0` |  | Some module types support a 'description' which shows within the module pages. This option controls whether it also displays on the course main page. 0 = does not display (default), 1 = displays |
| 21 | `availability` | longtext | YES | `NULL` |  | Availability restrictions for viewing this activity, in JSON format. Null if no restrictions. |
| 22 | `deletioninprogress` | tinyint(1) | NO | `0` |  |  |
| 23 | `downloadcontent` | tinyint(1) | YES | `1` |  | Whether the ability to download course module content is enabled for this activity |
| 24 | `lang` | varchar(30) | YES | `NULL` |  | Forced language for this activity. Null or '' means 'Do not force'. Otherwise a Moodle lang pack name like 'fr' or 'en_us'. |
| 25 | `enableaitools` | tinyint(1) | YES | `NULL` |  | Whether to allow the use of AI tools in this course module. 1 = enabled, 0 = disabled. |
| 26 | `enabledaiactions` | longtext | YES | `NULL` |  | List of enabled AI actions on this course module |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `groupingid` → `groupings`(`id`)
- **Index**: `visible`
- **Index**: `course`
- **Index**: `module`
- **Index**: `instance`
- **Index**: `idnumber`, `course`

### course_modules_completion

*Stores the completion state (completed or not completed, etc) of each user on each activity.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `coursemoduleid` | bigint(10) | NO |  | MUL | Activity that has been completed (or not). |
| 3 | `userid` | bigint(10) | NO |  | MUL | ID of user who has (or hasn't) completed the activity. |
| 4 | `completionstate` | tinyint(1) | NO |  |  | Whether or not the user has completed the activity. Available states: 0 = not completed [if there's no row in this table, that also counts as 0] 1 = completed 2 = completed, show passed 3 = completed, show failed |
| 5 | `overrideby` | bigint(10) | YES | `NULL` |  | Tracks whether this completion state has been set manually to override a previous state. |
| 6 | `timemodified` | bigint(10) | NO |  |  | Time at which the completion state last changed. |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `coursemoduleid`
- **Index** (unique): `userid`, `coursemoduleid`

### course_modules_viewed

*Tracks the completion viewed (viewed with cmid/userid and otherwise no row) of each user on each activity.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `coursemoduleid` | bigint(10) | NO |  | MUL | Activity that has been viewed (or not). |
| 3 | `userid` | bigint(10) | NO |  | MUL | ID of user who has (or hasn't) viewed the activity. |
| 4 | `timecreated` | bigint(10) | NO |  |  | Time at which the completion viewed created. |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `coursemoduleid`
- **Index** (unique): `userid`, `coursemoduleid`

### course_published

*Information about how and when an local courses were published to hubs*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `huburl` | varchar(255) | YES | `NULL` |  | the url of the "registered on" hub |
| 3 | `courseid` | bigint(10) | NO |  | MUL | the id of the published course |
| 4 | `timepublished` | bigint(10) | NO |  |  | The time when the publication occurred |
| 5 | `enrollable` | tinyint(1) | NO | `1` |  | 1 = enrollable, 0 = downloadable |
| 6 | `hubcourseid` | bigint(10) | NO |  | MUL | the course id on the hub server |
| 7 | `status` | tinyint(1) | YES | `0` |  | is the publication published or not |
| 8 | `timechecked` | bigint(10) | YES | `NULL` |  | the last time the status has been checked |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `courseid` → `course`(`id`)
- **Index**: `hubcourseid`

### course_request

*course requests*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `fullname` | varchar(1333) | NO | `''` |  |  |
| 3 | `shortname` | varchar(255) | NO | `''` | MUL |  |
| 4 | `summary` | longtext | NO |  |  |  |
| 5 | `summaryformat` | tinyint(2) | NO | `0` |  |  |
| 6 | `category` | bigint(10) | NO | `0` |  |  |
| 7 | `reason` | longtext | NO |  |  |  |
| 8 | `requester` | bigint(10) | NO | `0` |  |  |
| 9 | `password` | varchar(50) | NO | `''` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `shortname`

### course_sections

*to define the sections for each course*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `course` | bigint(10) | NO | `0` | MUL |  |
| 3 | `section` | bigint(10) | NO | `0` |  |  |
| 4 | `name` | varchar(1333) | YES | `NULL` |  |  |
| 5 | `summary` | longtext | YES | `NULL` |  |  |
| 6 | `summaryformat` | tinyint(2) | NO | `0` |  |  |
| 7 | `sequence` | longtext | YES | `NULL` |  |  |
| 8 | `visible` | tinyint(1) | NO | `1` |  |  |
| 9 | `availability` | longtext | YES | `NULL` |  | Availability restrictions for viewing this section, in JSON format. Null if no restrictions. |
| 10 | `component` | varchar(100) | YES | `NULL` | MUL | The delegate component of this section if any |
| 11 | `itemid` | bigint(10) | YES | `NULL` |  | The optional item id delegate component can use to identify its instance |
| 12 | `timemodified` | bigint(10) | NO | `0` |  | Time at which the course section was last changed. |

**Keys & indexes**

- **Primary key:** `id`
- **Index** (unique): `course`, `section`
- **Index**: `component`, `itemid`

### customfield_category

*core_customfield category table*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `name` | varchar(1333) | NO | `''` |  |  |
| 3 | `description` | longtext | YES | `NULL` |  |  |
| 4 | `descriptionformat` | bigint(10) | YES | `NULL` |  |  |
| 5 | `sortorder` | bigint(10) | YES | `NULL` |  |  |
| 6 | `timecreated` | bigint(10) | NO |  |  |  |
| 7 | `timemodified` | bigint(10) | NO |  |  |  |
| 8 | `component` | varchar(100) | NO | `''` | MUL |  |
| 9 | `area` | varchar(100) | NO | `''` |  |  |
| 10 | `itemid` | bigint(10) | NO | `0` |  |  |
| 11 | `contextid` | bigint(10) | YES | `NULL` | MUL |  |
| 12 | `shared` | tinyint(1) | YES | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `contextid` → `context`(`id`)
- **Index**: `component`, `area`, `itemid`, `sortorder`

### customfield_data

*core_customfield data table*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `fieldid` | bigint(10) | NO |  | MUL |  |
| 3 | `instanceid` | bigint(10) | NO |  | MUL |  |
| 4 | `intvalue` | bigint(10) | YES | `NULL` |  |  |
| 5 | `decvalue` | decimal(15,5) | YES | `NULL` |  |  |
| 6 | `shortcharvalue` | varchar(255) | YES | `NULL` |  |  |
| 7 | `charvalue` | varchar(1333) | YES | `NULL` |  |  |
| 8 | `value` | longtext | NO |  |  |  |
| 9 | `valueformat` | bigint(10) | NO |  |  |  |
| 10 | `valuetrust` | tinyint(2) | NO | `0` |  |  |
| 11 | `timecreated` | bigint(10) | NO |  |  |  |
| 12 | `timemodified` | bigint(10) | NO |  |  |  |
| 13 | `contextid` | bigint(10) | YES | `NULL` | MUL |  |
| 14 | `component` | varchar(100) | NO | `''` |  |  |
| 15 | `area` | varchar(100) | NO | `''` |  |  |
| 16 | `itemid` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `fieldid` → `customfield_field`(`id`)
- **FK** `contextid` → `context`(`id`)
- **Index** (unique): `instanceid`, `fieldid`, `component`, `area`, `itemid`
- **Index**: `fieldid`, `intvalue`
- **Index**: `fieldid`, `shortcharvalue`
- **Index**: `fieldid`, `decvalue`

### customfield_field

*core_customfield field table*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `shortname` | varchar(100) | NO | `''` |  |  |
| 3 | `name` | varchar(1333) | NO | `''` |  |  |
| 4 | `type` | varchar(100) | NO | `''` |  |  |
| 5 | `description` | longtext | YES | `NULL` |  |  |
| 6 | `descriptionformat` | bigint(10) | YES | `NULL` |  |  |
| 7 | `sortorder` | bigint(10) | YES | `NULL` |  |  |
| 8 | `categoryid` | bigint(10) | YES | `NULL` | MUL |  |
| 9 | `configdata` | longtext | YES | `NULL` |  |  |
| 10 | `timecreated` | bigint(10) | NO |  |  |  |
| 11 | `timemodified` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `categoryid` → `customfield_category`(`id`)
- **Index**: `categoryid`, `sortorder`

### customfield_shared

*core_customfield shared category table*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `categoryid` | bigint(10) | NO |  | MUL |  |
| 3 | `component` | varchar(100) | NO | `''` |  |  |
| 4 | `area` | varchar(100) | NO | `''` |  |  |
| 5 | `itemid` | bigint(10) | NO | `0` |  |  |
| 6 | `usermodified` | bigint(10) | NO | `0` | MUL |  |
| 7 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 8 | `timemodified` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `categoryid` → `customfield_category`(`id`)
- **FK** `usermodified` → `user`(`id`)
- **Index** (unique): `categoryid`, `component`, `area`, `itemid`

### data

*all database activities*

<sub>defined in `public/mod/data/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `course` | bigint(10) | NO | `0` | MUL |  |
| 3 | `name` | varchar(1333) | NO | `''` |  |  |
| 4 | `intro` | longtext | NO |  |  |  |
| 5 | `introformat` | smallint(4) | NO | `0` |  |  |
| 6 | `comments` | smallint(4) | NO | `0` |  |  |
| 7 | `timeavailablefrom` | bigint(10) | NO | `0` |  |  |
| 8 | `timeavailableto` | bigint(10) | NO | `0` |  |  |
| 9 | `timeviewfrom` | bigint(10) | NO | `0` |  |  |
| 10 | `timeviewto` | bigint(10) | NO | `0` |  |  |
| 11 | `requiredentries` | int(8) | NO | `0` |  |  |
| 12 | `requiredentriestoview` | int(8) | NO | `0` |  |  |
| 13 | `maxentries` | int(8) | NO | `0` |  |  |
| 14 | `rssarticles` | smallint(4) | NO | `0` |  |  |
| 15 | `singletemplate` | longtext | YES | `NULL` |  |  |
| 16 | `listtemplate` | longtext | YES | `NULL` |  |  |
| 17 | `listtemplateheader` | longtext | YES | `NULL` |  |  |
| 18 | `listtemplatefooter` | longtext | YES | `NULL` |  |  |
| 19 | `addtemplate` | longtext | YES | `NULL` |  |  |
| 20 | `rsstemplate` | longtext | YES | `NULL` |  |  |
| 21 | `rsstitletemplate` | longtext | YES | `NULL` |  |  |
| 22 | `csstemplate` | longtext | YES | `NULL` |  |  |
| 23 | `jstemplate` | longtext | YES | `NULL` |  |  |
| 24 | `asearchtemplate` | longtext | YES | `NULL` |  |  |
| 25 | `approval` | smallint(4) | NO | `0` |  |  |
| 26 | `manageapproved` | smallint(4) | NO | `1` |  |  |
| 27 | `scale` | bigint(10) | NO | `0` |  |  |
| 28 | `assessed` | bigint(10) | NO | `0` |  |  |
| 29 | `assesstimestart` | bigint(10) | NO | `0` |  |  |
| 30 | `assesstimefinish` | bigint(10) | NO | `0` |  |  |
| 31 | `defaultsort` | bigint(10) | NO | `0` |  |  |
| 32 | `defaultsortdir` | smallint(4) | NO | `0` |  |  |
| 33 | `editany` | smallint(4) | NO | `0` |  |  |
| 34 | `notification` | bigint(10) | NO | `0` |  | Notify people when things change |
| 35 | `timemodified` | bigint(10) | NO | `0` |  | The time the settings for this database module instance were last modified. |
| 36 | `config` | longtext | YES | `NULL` |  |  |
| 37 | `completionentries` | bigint(10) | YES | `0` |  | Number of entries required for completion |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `course`

### data_content

*the content introduced in each record/fields*

<sub>defined in `public/mod/data/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `fieldid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `recordid` | bigint(10) | NO | `0` | MUL |  |
| 4 | `content` | longtext | YES | `NULL` |  |  |
| 5 | `content1` | longtext | YES | `NULL` |  |  |
| 6 | `content2` | longtext | YES | `NULL` |  |  |
| 7 | `content3` | longtext | YES | `NULL` |  |  |
| 8 | `content4` | longtext | YES | `NULL` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `recordid` → `data_records`(`id`)
- **FK** `fieldid` → `data_fields`(`id`)

### data_fields

*every field available*

<sub>defined in `public/mod/data/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `dataid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `type` | varchar(255) | NO | `''` | MUL |  |
| 4 | `name` | varchar(255) | NO | `''` |  |  |
| 5 | `description` | longtext | NO |  |  |  |
| 6 | `required` | tinyint(1) | NO | `0` |  | Required fields must have a value when inserted by a user |
| 7 | `param1` | longtext | YES | `NULL` |  |  |
| 8 | `param2` | longtext | YES | `NULL` |  |  |
| 9 | `param3` | longtext | YES | `NULL` |  |  |
| 10 | `param4` | longtext | YES | `NULL` |  |  |
| 11 | `param5` | longtext | YES | `NULL` |  |  |
| 12 | `param6` | longtext | YES | `NULL` |  |  |
| 13 | `param7` | longtext | YES | `NULL` |  |  |
| 14 | `param8` | longtext | YES | `NULL` |  |  |
| 15 | `param9` | longtext | YES | `NULL` |  |  |
| 16 | `param10` | longtext | YES | `NULL` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `dataid` → `data`(`id`)
- **Index**: `type`, `dataid`

### data_records

*every record introduced*

<sub>defined in `public/mod/data/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `groupid` | bigint(10) | NO | `0` |  |  |
| 4 | `dataid` | bigint(10) | NO | `0` | MUL |  |
| 5 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 6 | `timemodified` | bigint(10) | NO | `0` |  |  |
| 7 | `approved` | smallint(4) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `dataid` → `data`(`id`)
- **FK** `userid` → `user`(`id`)

### enrol

*Instances of enrolment plugins used in courses, fields marked as custom have a plugin defined meaning, core does not touch them. Create a new linked table if you need even more custom fields.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `enrol` | varchar(20) | NO | `''` | MUL |  |
| 3 | `status` | bigint(10) | NO | `0` |  | 0..9 are system constants, 0 means active enrolment, see ENROL_STATUS_* constants, plugins may define own status greater than 10 |
| 4 | `courseid` | bigint(10) | NO |  | MUL |  |
| 5 | `sortorder` | bigint(10) | NO | `0` |  | order of enrol plugins in each course |
| 6 | `name` | varchar(255) | YES | `NULL` |  | Optional instance name |
| 7 | `enrolperiod` | bigint(10) | YES | `0` |  | Custom - enrolment duration |
| 8 | `enrolstartdate` | bigint(10) | YES | `0` |  | Custom - start of self enrolment |
| 9 | `enrolenddate` | bigint(10) | YES | `0` |  | Custom - end of enrolment |
| 10 | `expirynotify` | tinyint(1) | YES | `0` |  | Custom - notify users before expiration |
| 11 | `expirythreshold` | bigint(10) | YES | `0` |  | Custom - when should be the participants notified |
| 12 | `notifyall` | tinyint(1) | YES | `0` |  | Custom - Notify both participant and person responsible for enrolments |
| 13 | `password` | varchar(50) | YES | `NULL` |  | Custom - enrolment or access password |
| 14 | `cost` | varchar(20) | YES | `NULL` |  | Custom - enrolment cost |
| 15 | `currency` | varchar(3) | YES | `NULL` |  | Custom - cost currency |
| 16 | `roleid` | bigint(10) | YES | `0` | MUL | Custom - the default role given to participants who self-enrol |
| 17 | `customint1` | bigint(10) | YES | `NULL` |  | Custom - general int |
| 18 | `customint2` | bigint(10) | YES | `NULL` |  | Custom - general int |
| 19 | `customint3` | bigint(10) | YES | `NULL` |  | Custom - general int |
| 20 | `customint4` | bigint(10) | YES | `NULL` |  | Custom - general int |
| 21 | `customint5` | bigint(10) | YES | `NULL` |  | Custom - general int |
| 22 | `customint6` | bigint(10) | YES | `NULL` |  | Custom - general int |
| 23 | `customint7` | bigint(10) | YES | `NULL` |  | Custom - general int |
| 24 | `customint8` | bigint(10) | YES | `NULL` |  | Custom - general int |
| 25 | `customchar1` | varchar(255) | YES | `NULL` |  | Custom - general short name |
| 26 | `customchar2` | varchar(255) | YES | `NULL` |  | Custom - general short name |
| 27 | `customchar3` | varchar(1333) | YES | `NULL` |  | Custom - general short name |
| 28 | `customdec1` | decimal(12,7) | YES | `NULL` |  | Custom - general decimal |
| 29 | `customdec2` | decimal(12,7) | YES | `NULL` |  | Custom - general decimal |
| 30 | `customtext1` | longtext | YES | `NULL` |  | Custom - general text |
| 31 | `customtext2` | longtext | YES | `NULL` |  | Custom - general text |
| 32 | `customtext3` | longtext | YES | `NULL` |  | Custom - general text |
| 33 | `customtext4` | longtext | YES | `NULL` |  | Custom - general text |
| 34 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 35 | `timemodified` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `courseid` → `course`(`id`)
- **FK** `roleid` → `role`(`id`)
- **Index**: `enrol`

### enrol_flatfile

*enrol_flatfile table retrofitted from MySQL*

<sub>defined in `public/enrol/flatfile/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `action` | varchar(30) | NO | `''` |  |  |
| 3 | `roleid` | bigint(10) | NO |  | MUL |  |
| 4 | `userid` | bigint(10) | NO |  | MUL |  |
| 5 | `courseid` | bigint(10) | NO |  | MUL |  |
| 6 | `timestart` | bigint(10) | NO | `0` |  |  |
| 7 | `timeend` | bigint(10) | NO | `0` |  |  |
| 8 | `timemodified` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `courseid` → `course`(`id`)
- **FK** `userid` → `user`(`id`)
- **FK** `roleid` → `role`(`id`)

### enrol_lti_app_registration

*Details of each application that has been registered with the tool*

<sub>defined in `public/enrol/lti/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `name` | varchar(255) | NO | `''` |  | Common name to identify this platform to users |
| 3 | `platformid` | longtext | YES | `NULL` |  | The issuer URL |
| 4 | `clientid` | varchar(1333) | YES | `NULL` |  | The clientid string, generated by the platform when setting up the tool. |
| 5 | `uniqueid` | varchar(255) | NO | `''` | UNI | A unique local id, which can be used in the initiate login URI to provide {iss, clientid} uniqueness in the absence of the optional client_id claim. |
| 6 | `platformclienthash` | varchar(64) | YES | `NULL` | UNI | SHA256 hash of the platformid (issuer) and clientid |
| 7 | `platformuniqueidhash` | varchar(64) | YES | `NULL` | UNI | SHA256 hash of the platformid (issuer) and uniqueid |
| 8 | `authenticationrequesturl` | longtext | YES | `NULL` |  | The authorisation endpoint of the platform |
| 9 | `jwksurl` | longtext | YES | `NULL` |  | The JSON Web Key Set URL for the platform |
| 10 | `accesstokenurl` | longtext | YES | `NULL` |  |  |
| 11 | `status` | tinyint(1) | NO | `0` |  | Status of the registration, used to denote draft (incomplete) or active (complete) |
| 12 | `timecreated` | bigint(10) | NO |  |  |  |
| 13 | `timemodified` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Unique:** `uniqueid`
- **Index** (unique): `platformclienthash`
- **Index** (unique): `platformuniqueidhash`

### enrol_lti_context

*Each row represents a context in the platform, where resource links are added within a deployment.*

<sub>defined in `public/enrol/lti/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `contextid` | varchar(255) | NO | `''` |  | The id of the context on the platform |
| 3 | `ltideploymentid` | bigint(10) | NO |  | MUL | The id of the enrol_lti_deployment record containing the deployment information. |
| 4 | `type` | longtext | YES | `NULL` |  | The type of the context on the platform |
| 5 | `timecreated` | bigint(10) | NO |  |  |  |
| 6 | `timemodified` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `ltideploymentid` → `enrol_lti_deployment`(`id`)
- **Index** (unique): `ltideploymentid`, `contextid`

### enrol_lti_deployment

*Each row represents a deployment of a tool within a platform.*

<sub>defined in `public/enrol/lti/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `name` | varchar(255) | NO | `''` |  | A short name identifying the tool deployment to users |
| 3 | `deploymentid` | varchar(255) | NO | `''` |  | The id of the deployment, as defined in the platform |
| 4 | `platformid` | bigint(10) | NO |  | MUL | The platformid to which this deployment belongs |
| 5 | `legacyconsumerkey` | varchar(255) | YES | `NULL` |  | The legacy consumer key mapped to this deployment, if the deployment represents a migrated tool. |
| 6 | `timecreated` | bigint(10) | NO |  |  |  |
| 7 | `timemodified` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `platformid` → `enrol_lti_app_registration`(`id`)
- **Index** (unique): `platformid`, `deploymentid`

### enrol_lti_lti2_consumer

*LTI consumers interacting with moodle*

<sub>defined in `public/enrol/lti/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(11) | NO |  | PRI | (auto-increment) |
| 2 | `name` | varchar(50) | NO | `''` |  |  |
| 3 | `consumerkey256` | varchar(255) | NO | `''` | UNI |  |
| 4 | `consumerkey` | longtext | YES | `NULL` |  |  |
| 5 | `secret` | varchar(1024) | NO | `''` |  |  |
| 6 | `ltiversion` | varchar(10) | YES | `NULL` |  |  |
| 7 | `consumername` | varchar(255) | YES | `NULL` |  |  |
| 8 | `consumerversion` | varchar(255) | YES | `NULL` |  |  |
| 9 | `consumerguid` | varchar(1024) | YES | `NULL` |  |  |
| 10 | `profile` | longtext | YES | `NULL` |  |  |
| 11 | `toolproxy` | longtext | YES | `NULL` |  |  |
| 12 | `settings` | longtext | YES | `NULL` |  |  |
| 13 | `protected` | tinyint(1) | NO |  |  |  |
| 14 | `enabled` | tinyint(1) | NO |  |  |  |
| 15 | `enablefrom` | bigint(10) | YES | `NULL` |  |  |
| 16 | `enableuntil` | bigint(10) | YES | `NULL` |  |  |
| 17 | `lastaccess` | bigint(10) | YES | `NULL` |  |  |
| 18 | `created` | bigint(10) | NO |  |  |  |
| 19 | `updated` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index** (unique): `consumerkey256`

### enrol_lti_lti2_context

*Information about a specific LTI contexts from the consumers*

<sub>defined in `public/enrol/lti/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(11) | NO |  | PRI | (auto-increment) |
| 2 | `consumerid` | bigint(11) | NO |  | MUL |  |
| 3 | `lticontextkey` | varchar(255) | NO | `''` |  |  |
| 4 | `type` | varchar(100) | YES | `NULL` |  |  |
| 5 | `settings` | longtext | YES | `NULL` |  |  |
| 6 | `created` | bigint(10) | NO |  |  |  |
| 7 | `updated` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `consumerid` → `enrol_lti_lti2_consumer`(`id`)

### enrol_lti_lti2_nonce

*Nonce used for authentication between moodle and a consumer*

<sub>defined in `public/enrol/lti/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(11) | NO |  | PRI | (auto-increment) |
| 2 | `consumerid` | bigint(11) | NO |  | MUL |  |
| 3 | `value` | varchar(64) | NO | `''` |  |  |
| 4 | `expires` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `consumerid` → `enrol_lti_lti2_consumer`(`id`)

### enrol_lti_lti2_resource_link

*Link from the consumer to the tool*

<sub>defined in `public/enrol/lti/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(11) | NO |  | PRI | (auto-increment) |
| 2 | `contextid` | bigint(11) | YES | `NULL` | MUL |  |
| 3 | `consumerid` | bigint(11) | YES | `NULL` | MUL |  |
| 4 | `ltiresourcelinkkey` | varchar(255) | NO | `''` |  |  |
| 5 | `settings` | longtext | YES | `NULL` |  |  |
| 6 | `primaryresourcelinkid` | bigint(11) | YES | `NULL` | MUL |  |
| 7 | `shareapproved` | tinyint(1) | YES | `NULL` |  |  |
| 8 | `created` | bigint(10) | NO |  |  |  |
| 9 | `updated` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `contextid` → `enrol_lti_lti2_context`(`id`)
- **FK** `primaryresourcelinkid` → `enrol_lti_lti2_resource_link`(`id`)
- **FK** `consumerid` → `enrol_lti_lti2_consumer`(`id`)

### enrol_lti_lti2_share_key

*Resource link share key*

<sub>defined in `public/enrol/lti/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(11) | NO |  | PRI | (auto-increment) |
| 2 | `sharekey` | varchar(32) | NO | `''` | UNI |  |
| 3 | `resourcelinkid` | bigint(11) | NO |  | UNI |  |
| 4 | `autoapprove` | tinyint(1) | NO |  |  |  |
| 5 | `expires` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `resourcelinkid` → `enrol_lti_lti2_resource_link`(`id`) *(unique)*
- **Unique:** `sharekey`

### enrol_lti_lti2_tool_proxy

*A tool proxy between moodle and a consumer*

<sub>defined in `public/enrol/lti/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(11) | NO |  | PRI | (auto-increment) |
| 2 | `toolproxykey` | varchar(32) | NO | `''` | UNI |  |
| 3 | `consumerid` | bigint(11) | NO |  | MUL |  |
| 4 | `toolproxy` | longtext | NO |  |  |  |
| 5 | `created` | bigint(10) | NO |  |  |  |
| 6 | `updated` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `consumerid` → `enrol_lti_lti2_consumer`(`id`)
- **Unique:** `toolproxykey`

### enrol_lti_lti2_user_result

*Results for each user for each resource link*

<sub>defined in `public/enrol/lti/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(11) | NO |  | PRI | (auto-increment) |
| 2 | `resourcelinkid` | bigint(11) | NO |  | MUL |  |
| 3 | `ltiuserkey` | varchar(255) | NO | `''` |  |  |
| 4 | `ltiresultsourcedid` | varchar(1024) | NO | `''` |  |  |
| 5 | `created` | bigint(10) | NO |  |  |  |
| 6 | `updated` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `resourcelinkid` → `enrol_lti_lti2_resource_link`(`id`)

### enrol_lti_resource_link

*Each row represents a resource link for a platform and deployment*

<sub>defined in `public/enrol/lti/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `resourcelinkid` | varchar(255) | NO | `''` | MUL | The platform-and-deployment-unique id of the resource link |
| 3 | `ltideploymentid` | bigint(10) | NO |  | MUL | The id of the enrol_lti_deployment record containing the deployment information. |
| 4 | `resourceid` | bigint(10) | NO |  |  | The id of the local enrol_lti_tools record containing information about the published resource to which this resource link relates. |
| 5 | `lticontextid` | bigint(10) | YES | `NULL` | MUL | The id of the enrol_lti_context record containing information about the context from which this resource link originates. |
| 6 | `lineitemsservice` | varchar(1333) | YES | `NULL` |  | The URL for the line items service for this resource link |
| 7 | `lineitemservice` | varchar(1333) | YES | `NULL` |  | The URL for the line item service (if only one line item present). |
| 8 | `lineitemscope` | varchar(255) | YES | `NULL` |  | The ags line items authorization scope |
| 9 | `resultscope` | varchar(255) | YES | `NULL` |  | The ags result authorization scope |
| 10 | `scorescope` | varchar(255) | YES | `NULL` |  | The ags score items authorization scope |
| 11 | `contextmembershipsurl` | varchar(1333) | YES | `NULL` |  | The NRPS membership URL |
| 12 | `nrpsserviceversions` | varchar(255) | YES | `NULL` |  | The NRPS supported service versions |
| 13 | `timecreated` | bigint(10) | NO |  |  |  |
| 14 | `timemodified` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `ltideploymentid` → `enrol_lti_deployment`(`id`)
- **FK** `lticontextid` → `enrol_lti_context`(`id`)
- **Index** (unique): `resourcelinkid`, `ltideploymentid`

### enrol_lti_tool_consumer_map

*Table that maps the published tool to tool consumers.*

<sub>defined in `public/enrol/lti/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `toolid` | bigint(11) | NO |  | MUL | The tool ID. |
| 3 | `consumerid` | bigint(11) | NO |  | MUL | The consumer ID. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `toolid` → `enrol_lti_tools`(`id`)
- **FK** `consumerid` → `enrol_lti_lti2_consumer`(`id`)

### enrol_lti_tools

*List of tools provided to the remote system*

<sub>defined in `public/enrol/lti/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `enrolid` | bigint(10) | NO |  | MUL |  |
| 3 | `contextid` | bigint(10) | NO |  | MUL |  |
| 4 | `ltiversion` | varchar(15) | NO | `'LTI-1p3'` |  |  |
| 5 | `institution` | varchar(40) | NO | `''` |  |  |
| 6 | `lang` | varchar(30) | NO | `'en'` |  |  |
| 7 | `timezone` | varchar(100) | NO | `'99'` |  |  |
| 8 | `maxenrolled` | bigint(10) | NO | `0` |  |  |
| 9 | `maildisplay` | tinyint(2) | NO | `2` |  |  |
| 10 | `city` | varchar(120) | NO | `''` |  |  |
| 11 | `country` | varchar(2) | NO | `''` |  |  |
| 12 | `gradesync` | tinyint(1) | NO | `0` |  |  |
| 13 | `gradesynccompletion` | tinyint(1) | NO | `0` |  |  |
| 14 | `membersync` | tinyint(1) | NO | `0` |  |  |
| 15 | `membersyncmode` | tinyint(1) | NO | `0` |  |  |
| 16 | `roleinstructor` | bigint(10) | NO |  |  |  |
| 17 | `rolelearner` | bigint(10) | NO |  |  |  |
| 18 | `secret` | longtext | YES | `NULL` |  |  |
| 19 | `uuid` | varchar(36) | YES | `NULL` | UNI |  |
| 20 | `provisioningmodelearner` | tinyint(2) | YES | `NULL` |  |  |
| 21 | `provisioningmodeinstructor` | tinyint(2) | YES | `NULL` |  |  |
| 22 | `timecreated` | bigint(10) | NO |  |  |  |
| 23 | `timemodified` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `enrolid` → `enrol`(`id`)
- **FK** `contextid` → `context`(`id`)
- **Unique:** `uuid`

### enrol_lti_user_resource_link

*Join table mapping users to resource links as this is a many:many relationship*

<sub>defined in `public/enrol/lti/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `ltiuserid` | bigint(10) | NO |  | MUL | The id of the enrol_lti_users record |
| 3 | `resourcelinkid` | bigint(10) | NO |  | MUL | The id of the enrol_lti_resource_link record. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `ltiuserid` → `enrol_lti_users`(`id`)
- **FK** `resourcelinkid` → `enrol_lti_resource_link`(`id`)
- **Index** (unique): `ltiuserid`, `resourcelinkid`

### enrol_lti_users

*User access log and gradeback data*

<sub>defined in `public/enrol/lti/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO |  | MUL |  |
| 3 | `toolid` | bigint(10) | NO |  | MUL |  |
| 4 | `serviceurl` | longtext | YES | `NULL` |  |  |
| 5 | `sourceid` | longtext | YES | `NULL` |  |  |
| 6 | `ltideploymentid` | bigint(10) | YES | `NULL` | MUL |  |
| 7 | `consumerkey` | longtext | YES | `NULL` |  |  |
| 8 | `consumersecret` | longtext | YES | `NULL` |  |  |
| 9 | `membershipsurl` | longtext | YES | `NULL` |  |  |
| 10 | `membershipsid` | longtext | YES | `NULL` |  |  |
| 11 | `lastgrade` | decimal(10,5) | YES | `NULL` |  | The last grade that was sent |
| 12 | `lastaccess` | bigint(10) | YES | `NULL` |  | The time the user last accessed |
| 13 | `timecreated` | bigint(10) | YES | `NULL` |  | The time the user was created |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)
- **FK** `toolid` → `enrol_lti_tools`(`id`)
- **FK** `ltideploymentid` → `enrol_lti_deployment`(`id`)

### enrol_paypal

*Holds all known information about PayPal transactions*

<sub>defined in `public/enrol/paypal/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `business` | varchar(255) | NO | `''` | MUL |  |
| 3 | `receiver_email` | varchar(255) | NO | `''` | MUL |  |
| 4 | `receiver_id` | varchar(255) | NO | `''` |  |  |
| 5 | `item_name` | varchar(255) | NO | `''` |  |  |
| 6 | `courseid` | bigint(10) | NO | `0` | MUL |  |
| 7 | `userid` | bigint(10) | NO | `0` | MUL |  |
| 8 | `instanceid` | bigint(10) | NO | `0` | MUL |  |
| 9 | `memo` | varchar(255) | NO | `''` |  |  |
| 10 | `tax` | varchar(255) | NO | `''` |  |  |
| 11 | `option_name1` | varchar(255) | NO | `''` |  |  |
| 12 | `option_selection1_x` | varchar(255) | NO | `''` |  |  |
| 13 | `option_name2` | varchar(255) | NO | `''` |  |  |
| 14 | `option_selection2_x` | varchar(255) | NO | `''` |  |  |
| 15 | `payment_status` | varchar(255) | NO | `''` |  |  |
| 16 | `pending_reason` | varchar(255) | NO | `''` |  |  |
| 17 | `reason_code` | varchar(30) | NO | `''` |  |  |
| 18 | `txn_id` | varchar(255) | NO | `''` |  |  |
| 19 | `parent_txn_id` | varchar(255) | NO | `''` |  |  |
| 20 | `payment_type` | varchar(30) | NO | `''` |  |  |
| 21 | `timeupdated` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `courseid` → `course`(`id`)
- **FK** `userid` → `user`(`id`)
- **FK** `instanceid` → `enrol`(`id`)
- **Index**: `business`
- **Index**: `receiver_email`

### event

*For everything with a time associated to it*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `name` | longtext | NO |  |  |  |
| 3 | `description` | longtext | NO |  |  |  |
| 4 | `format` | smallint(4) | NO | `0` |  |  |
| 5 | `categoryid` | bigint(10) | NO | `0` | MUL |  |
| 6 | `courseid` | bigint(10) | NO | `0` | MUL |  |
| 7 | `groupid` | bigint(10) | NO | `0` | MUL |  |
| 8 | `userid` | bigint(10) | NO | `0` | MUL |  |
| 9 | `repeatid` | bigint(10) | NO | `0` |  |  |
| 10 | `component` | varchar(100) | YES | `NULL` | MUL | Component that created this event, if specified, only component itself can edit and delete it |
| 11 | `modulename` | varchar(20) | NO | `''` | MUL |  |
| 12 | `instance` | bigint(10) | NO | `0` |  |  |
| 13 | `type` | smallint(4) | NO | `0` | MUL |  |
| 14 | `eventtype` | varchar(20) | NO | `''` | MUL |  |
| 15 | `timestart` | bigint(10) | NO | `0` | MUL |  |
| 16 | `timeduration` | bigint(10) | NO | `0` | MUL |  |
| 17 | `timesort` | bigint(10) | YES | `NULL` |  |  |
| 18 | `visible` | smallint(4) | NO | `1` |  |  |
| 19 | `uuid` | varchar(255) | NO | `''` | MUL |  |
| 20 | `sequence` | bigint(10) | NO | `1` |  |  |
| 21 | `timemodified` | bigint(10) | NO | `0` |  |  |
| 22 | `subscriptionid` | bigint(10) | YES | `NULL` | MUL | The event_subscription id this event is associated with. |
| 23 | `priority` | bigint(10) | YES | `NULL` |  | The event's display priority. For multiple events with the same module name, instance and eventtype (e.g. for group overrides), the one with the higher priority will be displayed. |
| 24 | `location` | longtext | YES | `NULL` |  | Event Location |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `categoryid` → `course_categories`(`id`)
- **FK** `subscriptionid` → `event_subscriptions`(`id`)
- **Index**: `courseid`
- **Index**: `userid`
- **Index**: `timestart`
- **Index**: `timeduration`
- **Index**: `uuid`
- **Index**: `type`, `timesort`
- **Index**: `groupid`, `courseid`, `categoryid`, `visible`, `userid`
- **Index**: `eventtype`
- **Index**: `component`, `eventtype`, `instance`
- **Index**: `modulename`, `instance`, `eventtype`

### event_subscriptions

*Tracks subscriptions to remote calendars.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `url` | varchar(255) | NO | `''` |  |  |
| 3 | `categoryid` | bigint(10) | NO | `0` |  |  |
| 4 | `courseid` | bigint(10) | NO | `0` | MUL |  |
| 5 | `groupid` | bigint(10) | NO | `0` |  |  |
| 6 | `userid` | bigint(10) | NO | `0` | MUL |  |
| 7 | `eventtype` | varchar(20) | NO | `''` |  | The type of the event |
| 8 | `pollinterval` | bigint(10) | NO | `0` |  | Frequency of checks for new/changed events |
| 9 | `lastupdated` | bigint(10) | YES | `NULL` |  |  |
| 10 | `name` | varchar(255) | NO | `''` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `courseid` → `course`(`id`)
- **FK** `userid` → `user`(`id`)

### events_handlers

*This table is for storing which components requests what type of event, and the location of the responsible handlers. For example, the assignment registers 'grade_updated' event with a function assignment_grade_handler() that should be called event time an 'grade_updated' event is triggered by grade_update() function.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `eventname` | varchar(166) | NO | `''` | MUL | name of the event, e.g. 'grade_updated' |
| 3 | `component` | varchar(166) | NO | `''` |  | e.g. moodle, mod_forum, block_rss_client |
| 4 | `handlerfile` | varchar(255) | NO | `''` |  | path to the file of the function, eg /grade/export/lib.php |
| 5 | `handlerfunction` | longtext | YES | `NULL` |  | serialized string or array describing function, suitable to be passed to call_user_func() |
| 6 | `schedule` | varchar(255) | YES | `NULL` |  | 'cron' or 'instant'. |
| 7 | `status` | bigint(10) | NO | `0` |  | number of failed attempts to process this handler |
| 8 | `internal` | tinyint(2) | NO | `1` |  | 1 means standard plugin handler, 0 indicates if event handler sends data to external systems, this is used for example to prevent immediate sending of events from pending db transactions |

**Keys & indexes**

- **Primary key:** `id`
- **Index** (unique): `eventname`, `component`

### events_queue

*This table is for storing queued events. It stores only one copy of the eventdata here, and entries from this table are being references by the event_queue_handlers table.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `eventdata` | longtext | NO |  |  | serialized version of the data object passed to the event handler. |
| 3 | `stackdump` | longtext | YES | `NULL` |  | serialized debug_backtrace showing where the event was fired from |
| 4 | `userid` | bigint(10) | YES | `NULL` | MUL | $USER-&gt;id when the event was fired |
| 5 | `timecreated` | bigint(10) | NO |  |  | time stamp of the first time this was added |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)

### events_queue_handlers

*This is the list of queued handlers for processing. The event object is retrieved from the events_queue table. When no further reference is made to the event_queues table, the corresponding entry in the events_queue table should be deleted. Entry should get deleted after a successful event processing by the specified handler.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `queuedeventid` | bigint(10) | NO |  | MUL | foreign key id corresponding to the id of the event_queues table |
| 3 | `handlerid` | bigint(10) | NO |  | MUL | foreign key id corresponding to the id of the event_handlers table |
| 4 | `status` | bigint(10) | YES | `NULL` |  | number of failed attempts to process this handler |
| 5 | `errormessage` | longtext | YES | `NULL` |  | if an error happened last time we tried to process this event, record it here. |
| 6 | `timemodified` | bigint(10) | NO |  |  | time stamp of the last attempt to run this from the queue |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `queuedeventid` → `events_queue`(`id`)
- **FK** `handlerid` → `events_handlers`(`id`)

### external_functions

*list of all external functions*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `name` | varchar(200) | NO | `''` | UNI |  |
| 3 | `classname` | varchar(100) | NO | `''` |  |  |
| 4 | `methodname` | varchar(100) | NO | `''` |  |  |
| 5 | `classpath` | varchar(255) | YES | `NULL` |  |  |
| 6 | `component` | varchar(100) | NO | `''` |  |  |
| 7 | `capabilities` | varchar(255) | YES | `NULL` |  | all capabilities that are required to be run by the function (separated by comma) |
| 8 | `services` | varchar(1333) | YES | `NULL` |  | all the services (by shortname) where this function must be included |

**Keys & indexes**

- **Primary key:** `id`
- **Index** (unique): `name`

### external_services

*built in and custom external services*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `name` | varchar(200) | NO | `''` | UNI |  |
| 3 | `enabled` | tinyint(1) | NO |  |  |  |
| 4 | `requiredcapability` | varchar(150) | YES | `NULL` |  |  |
| 5 | `restrictedusers` | tinyint(1) | NO |  |  |  |
| 6 | `component` | varchar(100) | YES | `NULL` |  |  |
| 7 | `timecreated` | bigint(10) | NO |  |  |  |
| 8 | `timemodified` | bigint(10) | YES | `NULL` |  |  |
| 9 | `shortname` | varchar(255) | YES | `NULL` |  | a unique shortname |
| 10 | `downloadfiles` | tinyint(1) | NO | `0` |  | 1 if the service allow people to download file from webservice/plugins.php - 0 if not |
| 11 | `uploadfiles` | tinyint(1) | NO | `0` |  | 1 if the service allow people to upload files to webservice/upload.php - 0 if not |

**Keys & indexes**

- **Primary key:** `id`
- **Index** (unique): `name`

### external_services_functions

*lists functions available in each service group*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `externalserviceid` | bigint(10) | NO |  | MUL |  |
| 3 | `functionname` | varchar(200) | NO | `''` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `externalserviceid` → `external_services`(`id`)

### external_services_users

*users allowed to use services with restricted users flag*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `externalserviceid` | bigint(10) | NO |  | MUL |  |
| 3 | `userid` | bigint(10) | NO |  | MUL |  |
| 4 | `iprestriction` | varchar(255) | YES | `NULL` |  | ip restriction |
| 5 | `validuntil` | bigint(10) | YES | `NULL` |  | timestampt - valid until data |
| 6 | `timecreated` | bigint(10) | YES | `NULL` |  | created timestamp |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `externalserviceid` → `external_services`(`id`)
- **FK** `userid` → `user`(`id`)

### external_tokens

*Security tokens for accessing of external services*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `token` | varchar(128) | NO | `''` | MUL | security token, aka private access key |
| 3 | `privatetoken` | varchar(64) | YES | `NULL` |  | private token, generated at the same time that the token, must be stored safely by the ws client, to be transmitted only via https |
| 4 | `tokentype` | smallint(4) | NO |  |  | type of token: 0=permanent, no session; 1=linked to current browser session via sid; 2=permanent, with emulated session |
| 5 | `userid` | bigint(10) | NO |  | MUL | owner of the token |
| 6 | `externalserviceid` | bigint(10) | NO |  | MUL |  |
| 7 | `sid` | varchar(128) | YES | `NULL` | MUL | link to browser or emulated session |
| 8 | `contextid` | bigint(10) | NO |  | MUL | context id where in token valid |
| 9 | `creatorid` | bigint(10) | NO | `1` | MUL | user id of the token creator (useful to know when the administrator created a token and so display the token to a specific administrator) |
| 10 | `iprestriction` | varchar(255) | YES | `NULL` |  | ip restriction |
| 11 | `validuntil` | bigint(10) | YES | `NULL` |  | timestampt - valid until data |
| 12 | `timecreated` | bigint(10) | NO |  |  | created timestamp |
| 13 | `lastaccess` | bigint(10) | YES | `NULL` |  | last access timestamp |
| 14 | `name` | varchar(255) | YES | `NULL` |  | token name, used to identify the token at the table view |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)
- **FK** `externalserviceid` → `external_services`(`id`)
- **FK** `contextid` → `context`(`id`)
- **FK** `creatorid` → `user`(`id`)
- **Index**: `token`
- **Index**: `sid`

### favourite

*Stores the relationship between an arbitrary item (itemtype, itemid), and a context area (component, contextid) for a specific user. Used by the favourites subsystem.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `component` | varchar(100) | NO | `''` | MUL | Defines the Moodle component in which the favourite was created. |
| 3 | `itemtype` | varchar(100) | NO | `''` |  | The type of the item which is being favourited. Usually a table name, but doesn't have to be. E.g. 'messages' or 'message_conversations'. |
| 4 | `itemid` | bigint(10) | NO |  |  | The identifier of the item which is being favourited. |
| 5 | `contextid` | bigint(10) | NO |  | MUL | The context id of the item being favourited |
| 6 | `userid` | bigint(10) | NO |  | MUL | The id of the user to whom the favourite belongs |
| 7 | `ordering` | bigint(10) | YES | `NULL` |  | Optional ordering of the favourite within its context area. For example, this allows things like sorting favourite message conversations. |
| 8 | `timecreated` | bigint(10) | NO |  |  | Creation time |
| 9 | `timemodified` | bigint(10) | NO |  |  | Last modification time |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `contextid` → `context`(`id`)
- **FK** `userid` → `user`(`id`)
- **Index** (unique): `component`, `itemtype`, `itemid`, `contextid`, `userid`

### feedback

*all feedbacks*

<sub>defined in `public/mod/feedback/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `course` | bigint(10) | NO | `0` | MUL |  |
| 3 | `name` | varchar(1333) | NO | `''` |  |  |
| 4 | `intro` | longtext | NO |  |  |  |
| 5 | `introformat` | smallint(4) | NO | `0` |  |  |
| 6 | `anonymous` | tinyint(1) | NO | `1` |  |  |
| 7 | `email_notification` | tinyint(1) | NO | `1` |  |  |
| 8 | `multiple_submit` | tinyint(1) | NO | `1` |  |  |
| 9 | `autonumbering` | tinyint(1) | NO | `1` |  |  |
| 10 | `site_after_submit` | varchar(255) | NO | `''` |  |  |
| 11 | `page_after_submit` | longtext | NO |  |  |  |
| 12 | `page_after_submitformat` | tinyint(2) | NO | `0` |  |  |
| 13 | `publish_stats` | tinyint(1) | NO | `0` |  |  |
| 14 | `timeopen` | bigint(10) | NO | `0` |  |  |
| 15 | `timeclose` | bigint(10) | NO | `0` |  |  |
| 16 | `timemodified` | bigint(10) | NO | `0` |  |  |
| 17 | `completionsubmit` | tinyint(1) | NO | `0` |  | If this field is set to 1, then the activity will be automatically marked as 'complete' once the user submits their choice. |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `course`

### feedback_completed

*filled out feedback*

<sub>defined in `public/mod/feedback/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `feedback` | bigint(10) | NO | `0` | MUL |  |
| 3 | `userid` | bigint(10) | NO | `0` | MUL |  |
| 4 | `timemodified` | bigint(10) | NO | `0` |  |  |
| 5 | `random_response` | bigint(10) | NO | `0` |  |  |
| 6 | `anonymous_response` | tinyint(1) | NO | `0` |  |  |
| 7 | `courseid` | bigint(10) | NO | `0` | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `feedback` → `feedback`(`id`)
- **FK** `courseid` → `course`(`id`)
- **Index**: `userid`

### feedback_completedtmp

*filled out feedback*

<sub>defined in `public/mod/feedback/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `feedback` | bigint(10) | NO | `0` | MUL |  |
| 3 | `userid` | bigint(10) | NO | `0` | MUL |  |
| 4 | `guestid` | varchar(255) | NO | `''` |  |  |
| 5 | `timemodified` | bigint(10) | NO | `0` |  |  |
| 6 | `random_response` | bigint(10) | NO | `0` |  |  |
| 7 | `anonymous_response` | tinyint(1) | NO | `0` |  |  |
| 8 | `courseid` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `feedback` → `feedback`(`id`)
- **Index**: `userid`

### feedback_item

*feedback_items*

<sub>defined in `public/mod/feedback/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `feedback` | bigint(10) | NO | `0` | MUL |  |
| 3 | `template` | bigint(10) | NO | `0` | MUL |  |
| 4 | `name` | varchar(1333) | NO | `''` |  |  |
| 5 | `label` | varchar(255) | NO | `''` |  |  |
| 6 | `presentation` | longtext | NO |  |  |  |
| 7 | `typ` | varchar(255) | NO | `''` |  |  |
| 8 | `hasvalue` | tinyint(1) | NO | `0` |  |  |
| 9 | `position` | smallint(3) | NO | `0` |  |  |
| 10 | `required` | tinyint(1) | NO | `0` |  |  |
| 11 | `dependitem` | bigint(10) | NO | `0` |  |  |
| 12 | `dependvalue` | varchar(255) | NO | `''` |  |  |
| 13 | `options` | varchar(255) | NO | `''` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `feedback` → `feedback`(`id`)
- **FK** `template` → `feedback_template`(`id`)

### feedback_sitecourse_map

*feedback sitecourse map*

<sub>defined in `public/mod/feedback/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `feedbackid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `courseid` | bigint(10) | NO | `0` | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `feedbackid` → `feedback`(`id`)
- **Index**: `courseid`

### feedback_template

*templates of feedbackstructures*

<sub>defined in `public/mod/feedback/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `course` | bigint(10) | NO | `0` | MUL |  |
| 3 | `ispublic` | tinyint(1) | NO | `0` |  |  |
| 4 | `name` | varchar(255) | NO | `''` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `course`

### feedback_value

*values of the completeds*

<sub>defined in `public/mod/feedback/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `course_id` | bigint(10) | NO | `0` | MUL |  |
| 3 | `item` | bigint(10) | NO | `0` | MUL |  |
| 4 | `completed` | bigint(10) | NO | `0` | MUL |  |
| 5 | `tmp_completed` | bigint(10) | NO | `0` |  |  |
| 6 | `value` | longtext | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `item` → `feedback_item`(`id`)
- **Index**: `course_id`
- **Index** (unique): `completed`, `item`, `course_id`

### feedback_valuetmp

*values of the completedstmp*

<sub>defined in `public/mod/feedback/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `course_id` | bigint(10) | NO | `0` | MUL |  |
| 3 | `item` | bigint(10) | NO | `0` | MUL |  |
| 4 | `completed` | bigint(10) | NO | `0` | MUL |  |
| 5 | `tmp_completed` | bigint(10) | NO | `0` |  |  |
| 6 | `value` | longtext | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `item` → `feedback_item`(`id`)
- **Index**: `course_id`
- **Index** (unique): `completed`, `item`, `course_id`

### file_conversion

*Table to track file conversions.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `usermodified` | bigint(10) | NO |  | MUL |  |
| 3 | `timecreated` | bigint(10) | NO |  |  |  |
| 4 | `timemodified` | bigint(10) | NO |  |  |  |
| 5 | `sourcefileid` | bigint(10) | NO |  | MUL |  |
| 6 | `targetformat` | varchar(100) | NO | `''` |  |  |
| 7 | `status` | bigint(10) | YES | `0` |  |  |
| 8 | `statusmessage` | longtext | YES | `NULL` |  |  |
| 9 | `converter` | varchar(255) | YES | `NULL` |  |  |
| 10 | `destfileid` | bigint(10) | YES | `NULL` | MUL |  |
| 11 | `data` | longtext | YES | `NULL` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `sourcefileid` → `files`(`id`)
- **FK** `destfileid` → `files`(`id`)
- **FK** `usermodified` → `user`(`id`)

### files

*description of files, content is stored in sha1 file pool*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `contenthash` | varchar(40) | NO | `''` | MUL | sha1 hash of file content |
| 3 | `pathnamehash` | varchar(40) | NO | `''` | UNI | complete file path sha1 hash - unique for each file |
| 4 | `contextid` | bigint(10) | NO |  | MUL | The context id defined in context table - identifies the instance of plugin owning the file |
| 5 | `component` | varchar(100) | NO | `''` | MUL | Full name of the component owning the area |
| 6 | `filearea` | varchar(50) | NO | `''` |  | Like "coursefiles". "submission", "intro" and "content" (images and swf linked from summaries), etc. |
| 7 | `itemid` | bigint(10) | NO |  |  | Optional - some plugin specific item id (eg. forum post, blog entry or assignment submission, user id for user files) |
| 8 | `filepath` | varchar(255) | NO | `''` |  | Optional - relative path to file from module content root, useful in Scorm and Resource mod - most of the mods do not need this |
| 9 | `filename` | varchar(255) | NO | `''` | MUL | The full Unicode name of this file (case sensitive) - some chars are not allowed though |
| 10 | `userid` | bigint(10) | YES | `NULL` | MUL | Optional - general userid field - meaning depending on plugin |
| 11 | `filesize` | bigint(10) | NO |  |  |  |
| 12 | `mimetype` | varchar(100) | YES | `NULL` |  | type of file - jpeg image, open document spreadsheet |
| 13 | `status` | bigint(10) | NO | `0` |  | number greater than 0 means something is wrong with this file (virus, missing, etc.) |
| 14 | `source` | longtext | YES | `NULL` |  | contains the reference if the file is imported from external sites |
| 15 | `author` | varchar(255) | YES | `NULL` |  | The original author of the file |
| 16 | `license` | varchar(255) | YES | `NULL` | MUL | license of the file to guide reuse |
| 17 | `timecreated` | bigint(10) | NO |  |  |  |
| 18 | `timemodified` | bigint(10) | NO |  |  |  |
| 19 | `sortorder` | bigint(10) | NO | `0` |  | order of files |
| 20 | `referencefileid` | bigint(10) | YES | `NULL` | MUL | Use to indicate file is a proxy for repository file |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `contextid` → `context`(`id`)
- **FK** `userid` → `user`(`id`)
- **FK** `referencefileid` → `files_reference`(`id`)
- **Index**: `component`, `filearea`, `contextid`, `itemid`
- **Index**: `contenthash`
- **Index** (unique): `pathnamehash`
- **Index**: `license`
- **Index**: `filename`

### files_reference

*Store files references*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `repositoryid` | bigint(10) | NO |  | MUL |  |
| 3 | `lastsync` | bigint(10) | YES | `NULL` |  | Last time the proxy file was synced with repository |
| 4 | `reference` | longtext | YES | `NULL` |  | Identification of the external file. Repository plugins are interpreting it to locate the external file. |
| 5 | `referencehash` | varchar(40) | NO | `''` | MUL | Internal implementation detail, contains SHA1 hash of the reference field. Can be indexed and used for comparison. Not meant to be used by a non-core code. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `repositoryid` → `repository_instances`(`id`)
- **Index** (unique): `referencehash`, `repositoryid`

### filter_active

*Stores information about which filters are active in which contexts. Also the filter sort order. See get_active_filters in lib/filterlib.php for how this data is used.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `filter` | varchar(32) | NO | `''` |  | The filter internal name, like 'tex'. |
| 3 | `contextid` | bigint(10) | NO |  | MUL | References context.id. |
| 4 | `active` | smallint(4) | NO |  |  | Whether this filter is active in this context. +1 = On, -1 = Off, no row with this contextid = inherit. As a special case, when contextid points to the system context, -9999 means this filter is completely disabled. |
| 5 | `sortorder` | bigint(10) | NO | `0` |  | Only relevant if contextid points to the system context. In other cases this field should contain 0. The order in which the filters should be applied. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `contextid` → `context`(`id`)
- **Index** (unique): `contextid`, `filter`

### filter_config

*Stores per-context configuration settings for filters which have them.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `filter` | varchar(32) | NO | `''` |  | The filter internal name, like 'tex'. |
| 3 | `contextid` | bigint(10) | NO |  | MUL | References context.id. |
| 4 | `name` | varchar(255) | NO | `''` |  | The config variable name. |
| 5 | `value` | longtext | YES | `NULL` |  | The correspoding config variable value. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `contextid` → `context`(`id`)
- **Index** (unique): `contextid`, `filter`, `name`

### folder

*each record is one folder resource*

<sub>defined in `public/mod/folder/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `course` | bigint(10) | NO | `0` | MUL |  |
| 3 | `name` | varchar(1333) | NO | `''` |  |  |
| 4 | `intro` | longtext | YES | `NULL` |  |  |
| 5 | `introformat` | smallint(4) | NO | `0` |  |  |
| 6 | `revision` | bigint(10) | NO | `0` |  | incremented when after each file changes, solves browser caching issues |
| 7 | `timemodified` | bigint(10) | NO | `0` |  |  |
| 8 | `display` | smallint(4) | NO | `0` |  | Display type of folder contents - on a separate page or inline |
| 9 | `showexpanded` | tinyint(1) | NO | `1` |  | 1 = expanded, 0 = collapsed for sub-folders |
| 10 | `showdownloadfolder` | tinyint(1) | NO | `1` |  | 1 = show download folder button |
| 11 | `forcedownload` | tinyint(1) | NO | `1` |  | 1 = force download of individual files |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `course`

### forum

*Forums contain and structure discussion*

<sub>defined in `public/mod/forum/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `course` | bigint(10) | NO | `0` | MUL |  |
| 3 | `type` | varchar(20) | NO | `'general'` |  |  |
| 4 | `name` | varchar(1333) | NO | `''` |  |  |
| 5 | `intro` | longtext | NO |  |  |  |
| 6 | `introformat` | smallint(4) | NO | `0` |  | text format of intro field |
| 7 | `duedate` | bigint(10) | NO | `0` |  | A due date to show in the calendar. Not used for grading. |
| 8 | `cutoffdate` | bigint(10) | NO | `0` |  | The final date after which forum posts will no longer be accepted for this forum. |
| 9 | `assessed` | bigint(10) | NO | `0` |  |  |
| 10 | `assesstimestart` | bigint(10) | NO | `0` |  |  |
| 11 | `assesstimefinish` | bigint(10) | NO | `0` |  |  |
| 12 | `scale` | bigint(10) | NO | `0` |  |  |
| 13 | `grade_forum` | bigint(10) | NO | `0` |  |  |
| 14 | `grade_forum_notify` | smallint(4) | NO | `0` |  |  |
| 15 | `maxbytes` | bigint(10) | NO | `0` |  |  |
| 16 | `maxattachments` | bigint(10) | NO | `1` |  | Number of attachments allowed per post |
| 17 | `forcesubscribe` | tinyint(1) | NO | `0` |  |  |
| 18 | `trackingtype` | tinyint(2) | NO | `1` |  |  |
| 19 | `rsstype` | tinyint(2) | NO | `0` |  |  |
| 20 | `rssarticles` | tinyint(2) | NO | `0` |  |  |
| 21 | `timemodified` | bigint(10) | NO | `0` |  |  |
| 22 | `warnafter` | bigint(10) | NO | `0` |  |  |
| 23 | `blockafter` | bigint(10) | NO | `0` |  |  |
| 24 | `blockperiod` | bigint(10) | NO | `0` |  |  |
| 25 | `completiondiscussions` | int(9) | NO | `0` |  | Nonzero if a certain number of posts are required to mark this forum completed for a user. |
| 26 | `completionreplies` | int(9) | NO | `0` |  | Nonzero if a certain number of replies are required to mark this forum complete for a user. |
| 27 | `completionposts` | int(9) | NO | `0` |  | Nonzero if a certain number of posts or replies (total) are required to mark this forum complete for a user. |
| 28 | `displaywordcount` | tinyint(1) | NO | `0` |  |  |
| 29 | `lockdiscussionafter` | bigint(10) | NO | `0` |  |  |
| 30 | `showimmediately` | tinyint(1) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `course`

### forum_digests

*Keeps track of user mail delivery preferences for each forum*

<sub>defined in `public/mod/forum/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO |  | MUL |  |
| 3 | `forum` | bigint(10) | NO |  | MUL |  |
| 4 | `maildigest` | tinyint(1) | NO | `-1` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)
- **FK** `forum` → `forum`(`id`)
- **Unique:** `forum`, `userid`, `maildigest`

### forum_discussion_subs

*Users may choose to subscribe and unsubscribe from specific discussions.*

<sub>defined in `public/mod/forum/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `forum` | bigint(10) | NO |  | MUL |  |
| 3 | `userid` | bigint(10) | NO |  | MUL |  |
| 4 | `discussion` | bigint(10) | NO |  | MUL |  |
| 5 | `preference` | bigint(10) | NO | `1` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `forum` → `forum`(`id`)
- **FK** `userid` → `user`(`id`)
- **FK** `discussion` → `forum_discussions`(`id`)
- **Unique:** `userid`, `discussion`

### forum_discussions

*Forums are composed of discussions*

<sub>defined in `public/mod/forum/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `course` | bigint(10) | NO | `0` | MUL |  |
| 3 | `forum` | bigint(10) | NO | `0` | MUL |  |
| 4 | `name` | varchar(255) | NO | `''` |  |  |
| 5 | `firstpost` | bigint(10) | NO | `0` |  |  |
| 6 | `userid` | bigint(10) | NO | `0` | MUL |  |
| 7 | `groupid` | bigint(10) | NO | `-1` |  |  |
| 8 | `assessed` | tinyint(1) | NO | `1` |  |  |
| 9 | `timemodified` | bigint(10) | NO | `0` |  |  |
| 10 | `usermodified` | bigint(10) | NO | `0` | MUL |  |
| 11 | `timestart` | bigint(10) | NO | `0` |  |  |
| 12 | `timeend` | bigint(10) | NO | `0` |  |  |
| 13 | `pinned` | tinyint(1) | NO | `0` |  |  |
| 14 | `timelocked` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `forum` → `forum`(`id`)
- **FK** `usermodified` → `user`(`id`)
- **Index**: `userid`
- **Index**: `course`

### forum_grades

*Grading data for forum instances*

<sub>defined in `public/mod/forum/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `forum` | bigint(10) | NO |  | MUL | The ID of the forum that this grade relates to |
| 3 | `itemnumber` | bigint(10) | NO |  |  | The grade itemnumber |
| 4 | `userid` | bigint(10) | NO |  | MUL | The user who was graded |
| 5 | `grade` | decimal(10,5) | YES | `NULL` |  | The numerical grade for this user's forum assessment. Can be determined by scales/advancedgradingforms etc but will always be converted back to a floating point number. |
| 6 | `timecreated` | bigint(10) | NO |  |  |  |
| 7 | `timemodified` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `forum` → `forum`(`id`)
- **Index**: `userid`
- **Index** (unique): `forum`, `itemnumber`, `userid`

### forum_posts

*All posts are stored in this table*

<sub>defined in `public/mod/forum/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `discussion` | bigint(10) | NO | `0` | MUL |  |
| 3 | `parent` | bigint(10) | NO | `0` | MUL |  |
| 4 | `userid` | bigint(10) | NO | `0` | MUL |  |
| 5 | `created` | bigint(10) | NO | `0` | MUL |  |
| 6 | `modified` | bigint(10) | NO | `0` |  |  |
| 7 | `mailed` | tinyint(2) | NO | `0` | MUL |  |
| 8 | `subject` | varchar(255) | NO | `''` |  |  |
| 9 | `message` | longtext | NO |  |  |  |
| 10 | `messageformat` | tinyint(2) | NO | `0` |  |  |
| 11 | `messagetrust` | tinyint(2) | NO | `0` |  |  |
| 12 | `attachment` | varchar(100) | NO | `''` |  |  |
| 13 | `totalscore` | smallint(4) | NO | `0` |  |  |
| 14 | `mailnow` | bigint(10) | NO | `0` |  |  |
| 15 | `deleted` | tinyint(1) | NO | `0` |  |  |
| 16 | `privatereplyto` | bigint(10) | NO | `0` | MUL |  |
| 17 | `wordcount` | bigint(20) | YES | `NULL` |  |  |
| 18 | `charcount` | bigint(20) | YES | `NULL` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `discussion` → `forum_discussions`(`id`)
- **FK** `parent` → `forum_posts`(`id`)
- **Index**: `userid`
- **Index**: `created`
- **Index**: `mailed`
- **Index**: `privatereplyto`

### forum_queue

*For keeping track of posts that will be mailed in digest form*

<sub>defined in `public/mod/forum/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `discussionid` | bigint(10) | NO | `0` | MUL |  |
| 4 | `postid` | bigint(10) | NO | `0` | MUL |  |
| 5 | `timemodified` | bigint(10) | NO | `0` |  | The modified time of the original post |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `discussionid` → `forum_discussions`(`id`)
- **FK** `postid` → `forum_posts`(`id`)
- **Index**: `userid`

### forum_read

*Tracks each users read posts*

<sub>defined in `public/mod/forum/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `forumid` | bigint(10) | NO | `0` | MUL |  |
| 4 | `discussionid` | bigint(10) | NO | `0` | MUL |  |
| 5 | `postid` | bigint(10) | NO | `0` | MUL |  |
| 6 | `firstread` | bigint(10) | NO | `0` |  |  |
| 7 | `lastread` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `forumid`, `userid`
- **Index**: `discussionid`, `userid`
- **Index**: `postid`, `userid`
- **Index**: `userid`

### forum_subscriptions

*Keeps track of who is subscribed to what forum*

<sub>defined in `public/mod/forum/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `forum` | bigint(10) | NO | `0` | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `forum` → `forum`(`id`)
- **Unique:** `userid`, `forum`
- **Index**: `userid`

### forum_track_prefs

*Tracks each users untracked forums*

<sub>defined in `public/mod/forum/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `forumid` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `userid`, `forumid`

### glossary

*all glossaries*

<sub>defined in `public/mod/glossary/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `course` | bigint(10) | NO | `0` | MUL |  |
| 3 | `name` | varchar(1333) | NO | `''` |  |  |
| 4 | `intro` | longtext | NO |  |  |  |
| 5 | `introformat` | smallint(4) | NO | `0` |  |  |
| 6 | `allowduplicatedentries` | tinyint(2) | NO | `0` |  |  |
| 7 | `displayformat` | varchar(50) | NO | `'dictionary'` |  |  |
| 8 | `mainglossary` | tinyint(2) | NO | `0` |  |  |
| 9 | `showspecial` | tinyint(2) | NO | `1` |  |  |
| 10 | `showalphabet` | tinyint(2) | NO | `1` |  |  |
| 11 | `showall` | tinyint(2) | NO | `1` |  |  |
| 12 | `allowcomments` | tinyint(2) | NO | `0` |  |  |
| 13 | `allowprintview` | tinyint(2) | NO | `1` |  |  |
| 14 | `usedynalink` | tinyint(2) | NO | `1` |  |  |
| 15 | `defaultapproval` | tinyint(2) | NO | `1` |  |  |
| 16 | `approvaldisplayformat` | varchar(50) | NO | `'default'` |  | Display Format when approving entries |
| 17 | `globalglossary` | tinyint(2) | NO | `0` |  |  |
| 18 | `entbypage` | smallint(3) | NO | `10` |  |  |
| 19 | `editalways` | tinyint(2) | NO | `0` |  |  |
| 20 | `rsstype` | tinyint(2) | NO | `0` |  |  |
| 21 | `rssarticles` | tinyint(2) | NO | `0` |  |  |
| 22 | `assessed` | bigint(10) | NO | `0` |  |  |
| 23 | `assesstimestart` | bigint(10) | NO | `0` |  |  |
| 24 | `assesstimefinish` | bigint(10) | NO | `0` |  |  |
| 25 | `scale` | bigint(10) | NO | `0` |  |  |
| 26 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 27 | `timemodified` | bigint(10) | NO | `0` |  |  |
| 28 | `completionentries` | int(9) | NO | `0` |  | Non zero if a certain number of entries are required to mark this glossary complete for a user. |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `course`

### glossary_alias

*entries alias*

<sub>defined in `public/mod/glossary/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `entryid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `alias` | varchar(255) | NO | `''` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `entryid` → `glossary_entries`(`id`)

### glossary_categories

*all categories for glossary entries*

<sub>defined in `public/mod/glossary/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `glossaryid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `name` | varchar(255) | NO | `''` |  |  |
| 4 | `usedynalink` | tinyint(2) | NO | `1` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `glossaryid` → `glossary`(`id`)

### glossary_entries

*all glossary entries*

<sub>defined in `public/mod/glossary/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `glossaryid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `userid` | bigint(10) | NO | `0` | MUL |  |
| 4 | `concept` | varchar(255) | NO | `''` | MUL |  |
| 5 | `definition` | longtext | NO |  |  |  |
| 6 | `definitionformat` | tinyint(2) | NO | `0` |  |  |
| 7 | `definitiontrust` | tinyint(2) | NO | `0` |  |  |
| 8 | `attachment` | varchar(100) | NO | `''` |  |  |
| 9 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 10 | `timemodified` | bigint(10) | NO | `0` |  |  |
| 11 | `teacherentry` | tinyint(2) | NO | `0` |  |  |
| 12 | `sourceglossaryid` | bigint(10) | NO | `0` |  |  |
| 13 | `usedynalink` | tinyint(2) | NO | `1` |  |  |
| 14 | `casesensitive` | tinyint(2) | NO | `0` |  |  |
| 15 | `fullmatch` | tinyint(2) | NO | `1` |  |  |
| 16 | `approved` | tinyint(2) | NO | `1` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `glossaryid` → `glossary`(`id`)
- **Index**: `userid`
- **Index**: `concept`

### glossary_entries_categories

*categories of each glossary entry*

<sub>defined in `public/mod/glossary/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `categoryid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `entryid` | bigint(10) | NO | `0` | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `categoryid` → `glossary_categories`(`id`)
- **FK** `entryid` → `glossary_entries`(`id`)

### glossary_formats

*Setting of the display formats*

<sub>defined in `public/mod/glossary/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `name` | varchar(50) | NO | `''` |  |  |
| 3 | `popupformatname` | varchar(50) | NO | `''` |  |  |
| 4 | `visible` | tinyint(2) | NO | `1` |  |  |
| 5 | `showgroup` | tinyint(2) | NO | `1` |  |  |
| 6 | `showtabs` | varchar(100) | YES | `NULL` |  |  |
| 7 | `defaultmode` | varchar(50) | NO | `''` |  |  |
| 8 | `defaulthook` | varchar(50) | NO | `''` |  |  |
| 9 | `sortkey` | varchar(50) | NO | `''` |  |  |
| 10 | `sortorder` | varchar(50) | NO | `''` |  |  |

**Keys & indexes**

- **Primary key:** `id`

### grade_categories

*This table keeps information about categories, used for grouping items.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `courseid` | bigint(10) | NO |  | MUL | The course this grade category is part of |
| 3 | `parent` | bigint(10) | YES | `NULL` | MUL | Categories can be hierarchical |
| 4 | `depth` | bigint(10) | NO | `0` |  | How many parents does this category have? |
| 5 | `path` | varchar(255) | YES | `NULL` |  | shows the path as /1/2/3 (like course_categories) |
| 6 | `fullname` | varchar(255) | NO | `''` |  | The name of this grade category |
| 7 | `aggregation` | bigint(10) | NO | `0` |  | A constant pointing to one of the predefined aggregation strategies (none, mean,median,sum, etc) |
| 8 | `keephigh` | bigint(10) | NO | `0` |  | Keep only the X highest items |
| 9 | `droplow` | bigint(10) | NO | `0` |  | Drop the X lowest items |
| 10 | `aggregateonlygraded` | tinyint(1) | NO | `0` |  | aggregate only graded activities |
| 11 | `aggregateoutcomes` | tinyint(1) | NO | `0` |  | Aggregate outcomes |
| 12 | `timecreated` | bigint(10) | NO |  |  |  |
| 13 | `timemodified` | bigint(10) | NO |  |  |  |
| 14 | `hidden` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `courseid` → `course`(`id`)
- **FK** `parent` → `grade_categories`(`id`)

### grade_categories_history

*History of grade_categories*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `action` | bigint(10) | NO | `0` | MUL | created/modified/deleted constants |
| 3 | `oldid` | bigint(10) | NO |  | MUL |  |
| 4 | `source` | varchar(255) | YES | `NULL` |  | What caused the modification? manual/module/import/... |
| 5 | `timemodified` | bigint(10) | YES | `NULL` | MUL | The last time this grade_item was modified |
| 6 | `loggeduser` | bigint(10) | YES | `NULL` | MUL | the userid of the person who last modified this outcome |
| 7 | `courseid` | bigint(10) | NO |  | MUL | The course this grade category is part of |
| 8 | `parent` | bigint(10) | YES | `NULL` | MUL | Categories can be hierarchical |
| 9 | `depth` | bigint(10) | NO | `0` |  | How many parents does this category have? |
| 10 | `path` | varchar(255) | YES | `NULL` |  | shows the path as /1/2/3 (like course_categories) |
| 11 | `fullname` | varchar(255) | NO | `''` |  | The name of this grade category |
| 12 | `aggregation` | bigint(10) | NO | `0` |  | A constant pointing to one of the predefined aggregation strategies (none, mean,median,sum, etc) |
| 13 | `keephigh` | bigint(10) | NO | `0` |  | Keep only the X highest items |
| 14 | `droplow` | bigint(10) | NO | `0` |  | Drop the X lowest items |
| 15 | `aggregateonlygraded` | tinyint(1) | NO | `0` |  | aggregate only graded items |
| 16 | `aggregateoutcomes` | tinyint(1) | NO | `0` |  | Aggregate outcomes |
| 17 | `aggregatesubcats` | tinyint(1) | NO | `0` |  | This setting was removed from grade_categories. It is kept here only to preserve history. |
| 18 | `hidden` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `oldid` → `grade_categories`(`id`)
- **FK** `courseid` → `course`(`id`)
- **FK** `parent` → `grade_categories`(`id`)
- **FK** `loggeduser` → `user`(`id`)
- **Index**: `action`
- **Index**: `timemodified`

### grade_grades

*grade_grades  This table keeps individual grades for each user and each item, exactly as imported or submitted by modules. The rawgrademax/min and rawscaleid are stored here to record the values at the time the grade was stored, because teachers might change this for an activity! All the results are normalised/resampled for the final grade value.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `itemid` | bigint(10) | NO |  | MUL | The item this grade belongs to |
| 3 | `userid` | bigint(10) | NO |  | MUL | The user who this grade is for |
| 4 | `rawgrade` | decimal(10,5) | YES | `NULL` |  | If the grade is a float value (or has been converted to one) |
| 5 | `rawgrademax` | decimal(10,5) | NO | `100.00000` |  | The maximum allowable grade when this was created |
| 6 | `rawgrademin` | decimal(10,5) | NO | `0.00000` |  | The minimum allowable grade when this was created |
| 7 | `rawscaleid` | bigint(10) | YES | `NULL` | MUL | If this grade is based on a scale, which one was it? |
| 8 | `usermodified` | bigint(10) | YES | `NULL` | MUL | the userid of the person who last modified this grade |
| 9 | `finalgrade` | decimal(10,5) | YES | `NULL` |  | The final grade (cached) after all calculations are made |
| 10 | `hidden` | bigint(10) | NO | `0` |  | show 0, hide 1 or hide until date |
| 11 | `locked` | bigint(10) | NO | `0` | MUL | not locked 0, locked from date |
| 12 | `locktime` | bigint(10) | NO | `0` |  | automatic locking of final grade, 0 means none, date otherwise |
| 13 | `exported` | bigint(10) | NO | `0` |  | date of last grade export, 0 if none |
| 14 | `overridden` | bigint(10) | NO | `0` |  | indicates grade overridden from gradebook, 0 means none, date means overridden |
| 15 | `excluded` | bigint(10) | NO | `0` |  | grade excluded from aggregation functions, date means when excluded |
| 16 | `feedback` | longtext | YES | `NULL` |  | grading feedback |
| 17 | `feedbackformat` | bigint(10) | NO | `0` |  | format of feedback text |
| 18 | `information` | longtext | YES | `NULL` |  | optiona information |
| 19 | `informationformat` | bigint(10) | NO | `0` |  | format of information text |
| 20 | `timecreated` | bigint(10) | YES | `NULL` |  | the time this grade was first created |
| 21 | `timemodified` | bigint(10) | YES | `NULL` |  | the time this grade was last modified |
| 22 | `aggregationstatus` | varchar(10) | NO | `'unknown'` |  | One of several values describing how this grade_grade was used when calculating the aggregation. Possible values are "unknown", "dropped", "novalue", "used" |
| 23 | `aggregationweight` | decimal(10,5) | YES | `NULL` |  | If the aggregationstatus == 'included', then this is the percent this item contributed to the aggregation. |
| 24 | `deductedmark` | decimal(10,5) | NO | `0.00000` |  | The mark deducted from final grade |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `itemid` → `grade_items`(`id`)
- **FK** `userid` → `user`(`id`)
- **FK** `rawscaleid` → `scale`(`id`)
- **FK** `usermodified` → `user`(`id`)
- **Unique:** `userid`, `itemid`
- **Index**: `locked`, `locktime`

### grade_grades_history

*History table*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `action` | bigint(10) | NO | `0` | MUL | created/modified/deleted constants |
| 3 | `oldid` | bigint(10) | NO |  | MUL |  |
| 4 | `source` | varchar(255) | YES | `NULL` |  | What caused the modification? manual/module/import/... |
| 5 | `timemodified` | bigint(10) | YES | `NULL` | MUL | The last time this grade_item was modified |
| 6 | `loggeduser` | bigint(10) | YES | `NULL` | MUL | the userid of the person who last modified this outcome |
| 7 | `itemid` | bigint(10) | NO |  | MUL | The item this grade belongs to |
| 8 | `userid` | bigint(10) | NO |  | MUL | The user who this grade is for |
| 9 | `rawgrade` | decimal(10,5) | YES | `NULL` |  | If the grade is a float value (or has been converted to one) |
| 10 | `rawgrademax` | decimal(10,5) | NO | `100.00000` |  | The maximum allowable grade when this was created |
| 11 | `rawgrademin` | decimal(10,5) | NO | `0.00000` |  | The minimum allowable grade when this was created |
| 12 | `rawscaleid` | bigint(10) | YES | `NULL` | MUL | If this grade is based on a scale, which one was it? |
| 13 | `usermodified` | bigint(10) | YES | `NULL` | MUL | the userid of the person who last modified this grade |
| 14 | `finalgrade` | decimal(10,5) | YES | `NULL` |  | The final grade (cached) after all calculations are made |
| 15 | `hidden` | bigint(10) | NO | `0` |  | show 0, hide 1 or hide until date |
| 16 | `locked` | bigint(10) | NO | `0` |  | not locked 0, locked from date |
| 17 | `locktime` | bigint(10) | NO | `0` |  | automatic locking of final grade, 0 means none, date otherwise |
| 18 | `exported` | bigint(10) | NO | `0` |  | date of last grade export, 0 if none |
| 19 | `overridden` | bigint(10) | NO | `0` |  | indicates grade overridden from gradebook, 0 means none, date means overridden |
| 20 | `excluded` | bigint(10) | NO | `0` |  | grade excluded from aggregation functions, date means when excluded |
| 21 | `feedback` | longtext | YES | `NULL` |  | grading feedback |
| 22 | `feedbackformat` | bigint(10) | NO | `0` |  | format of feedback text |
| 23 | `information` | longtext | YES | `NULL` |  | optiona information |
| 24 | `informationformat` | bigint(10) | NO | `0` |  | format of information text |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `oldid` → `grade_grades`(`id`)
- **FK** `itemid` → `grade_items`(`id`)
- **FK** `userid` → `user`(`id`)
- **FK** `rawscaleid` → `scale`(`id`)
- **FK** `usermodified` → `user`(`id`)
- **FK** `loggeduser` → `user`(`id`)
- **Index**: `action`
- **Index**: `timemodified`
- **Index**: `userid`, `itemid`, `timemodified`

### grade_import_newitem

*temporary table for storing new grade_item names from grade import*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `itemname` | varchar(255) | NO | `''` |  | new grade item name |
| 3 | `importcode` | bigint(10) | NO |  |  | import batch code for identification |
| 4 | `importer` | bigint(10) | NO |  | MUL | user importing the data |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `importer` → `user`(`id`)

### grade_import_values

*Temporary table for importing grades*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `itemid` | bigint(10) | YES | `NULL` | MUL | if set, this points to existing grade_items id |
| 3 | `newgradeitem` | bigint(10) | YES | `NULL` | MUL | if set, points to the id of grade_import_newitem |
| 4 | `userid` | bigint(10) | NO |  | MUL |  |
| 5 | `finalgrade` | decimal(10,5) | YES | `NULL` |  | raw grade value |
| 6 | `feedback` | longtext | YES | `NULL` |  |  |
| 7 | `importcode` | bigint(10) | NO |  |  | similar to backup_code, a unique batch code for identifying one batch of imports |
| 8 | `importer` | bigint(10) | YES | `NULL` | MUL |  |
| 9 | `importonlyfeedback` | tinyint(1) | YES | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `itemid` → `grade_items`(`id`)
- **FK** `newgradeitem` → `grade_import_newitem`(`id`)
- **FK** `importer` → `user`(`id`)
- **FK** `userid` → `user`(`id`)

### grade_items

*This table keeps information about gradeable items (ie columns). If an activity (eg an assignment or quiz) has multiple grade_items associated with it (eg several outcomes or numerical grades), then there will be a corresponding multiple number of rows in this table.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `courseid` | bigint(10) | YES | `NULL` | MUL | The course this item is part of |
| 3 | `categoryid` | bigint(10) | YES | `NULL` | MUL | (optional) the category group this item belongs to |
| 4 | `itemname` | varchar(1333) | YES | `NULL` |  | The name of this item (pushed in by the module) |
| 5 | `itemtype` | varchar(30) | NO | `''` | MUL | 'mod', 'blocks', 'import', 'calculated' etc |
| 6 | `itemmodule` | varchar(30) | YES | `NULL` |  | 'forum', 'quiz', 'csv', etc |
| 7 | `iteminstance` | bigint(10) | YES | `NULL` |  | id of the item module |
| 8 | `itemnumber` | bigint(10) | YES | `NULL` |  | Can be used to distinguish multiple grades for an activity |
| 9 | `iteminfo` | longtext | YES | `NULL` |  | Info and notes about this item XXX |
| 10 | `idnumber` | varchar(255) | YES | `NULL` | MUL | Arbitrary idnumber provided by the module responsible |
| 11 | `calculation` | longtext | YES | `NULL` |  | Formula describing how to derive this grade from other items, referring to them using giXXX where XXX is grade item id ... eg something like: =sin(square([#gi20#])) + [#gi30#] |
| 12 | `gradetype` | smallint(4) | NO | `1` | MUL | 0 = none, 1 = value, 2 = scale, 3 = text |
| 13 | `grademax` | decimal(10,5) | NO | `100.00000` |  | What is the maximum allowable grade? |
| 14 | `grademin` | decimal(10,5) | NO | `0.00000` |  | What is the minimum allowable grade? |
| 15 | `scaleid` | bigint(10) | YES | `NULL` | MUL | If this grade is based on a scale, which one is it? |
| 16 | `outcomeid` | bigint(10) | YES | `NULL` | MUL | If this grade is related to an outcome, which one is it? |
| 17 | `gradepass` | decimal(10,5) | NO | `0.00000` |  | What grade is needed to pass? grademin &lt; gradepass &lt;= grademax |
| 18 | `multfactor` | decimal(10,5) | NO | `1.00000` |  | Multiply all grades by this |
| 19 | `plusfactor` | decimal(10,5) | NO | `0.00000` |  | Add this to all grades |
| 20 | `aggregationcoef` | decimal(10,5) | NO | `0.00000` |  | Aggregation coefficient used for category weights or other aggregation types |
| 21 | `aggregationcoef2` | decimal(10,5) | NO | `0.00000` |  | Aggregation coefficient used for weights in aggregation types with both extra credit and weight |
| 22 | `sortorder` | bigint(10) | NO | `0` |  | Sorting order of the columns |
| 23 | `display` | bigint(10) | NO | `0` |  | Display as real grades, percentages (in reference to the minimum and maximum grades) or letters (A, B, C etc..), or course default (0) |
| 24 | `decimals` | tinyint(1) | YES | `NULL` |  | Also known as precision, the number of digits after the decimal point symbol. |
| 25 | `hidden` | bigint(10) | NO | `0` |  | 1 is hidden, &gt; 1 is a date to hide until (prevents viewing) |
| 26 | `locked` | bigint(10) | NO | `0` | MUL | 1 is locked, &gt; 1 is a date to lock until (prevents update) |
| 27 | `locktime` | bigint(10) | NO | `0` |  | lock all final grades after this date |
| 28 | `needsupdate` | bigint(10) | NO | `0` |  | If this flag is set, then the whole column will be recalculated |
| 29 | `weightoverride` | tinyint(1) | NO | `0` |  |  |
| 30 | `timecreated` | bigint(10) | YES | `NULL` |  | The first time this grade_item was created |
| 31 | `timemodified` | bigint(10) | YES | `NULL` |  | The last time this grade_item was modified |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `courseid` → `course`(`id`)
- **FK** `categoryid` → `grade_categories`(`id`)
- **FK** `scaleid` → `scale`(`id`)
- **FK** `outcomeid` → `grade_outcomes`(`id`)
- **Index**: `locked`, `locktime`
- **Index**: `itemtype`, `needsupdate`
- **Index**: `gradetype`
- **Index**: `idnumber`, `courseid`
- **Index**: `itemtype`, `itemmodule`, `iteminstance`, `courseid`

### grade_items_history

*History of grade_items*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `action` | bigint(10) | NO | `0` | MUL | created/modified/deleted constants |
| 3 | `oldid` | bigint(10) | NO |  | MUL |  |
| 4 | `source` | varchar(255) | YES | `NULL` |  | What caused the modification? manual/module/import/... |
| 5 | `timemodified` | bigint(10) | YES | `NULL` | MUL | The last time this grade_item was modified |
| 6 | `loggeduser` | bigint(10) | YES | `NULL` | MUL | the userid of the person who last modified this outcome |
| 7 | `courseid` | bigint(10) | YES | `NULL` | MUL | The course this item is part of |
| 8 | `categoryid` | bigint(10) | YES | `NULL` | MUL | (optional) the category group this item belongs to |
| 9 | `itemname` | varchar(1333) | YES | `NULL` |  | The name of this item (pushed in by the module) |
| 10 | `itemtype` | varchar(30) | NO | `''` |  | 'mod', 'blocks', 'import', 'calculated' etc |
| 11 | `itemmodule` | varchar(30) | YES | `NULL` |  | 'forum', 'quiz', 'csv', etc |
| 12 | `iteminstance` | bigint(10) | YES | `NULL` |  | id of the item module |
| 13 | `itemnumber` | bigint(10) | YES | `NULL` |  | Can be used to distinguish multiple grades for an activity |
| 14 | `iteminfo` | longtext | YES | `NULL` |  | Info and notes about this item XXX |
| 15 | `idnumber` | varchar(255) | YES | `NULL` |  | Arbitrary idnumber provided by the module responsible |
| 16 | `calculation` | longtext | YES | `NULL` |  | Formula describing how to derive this grade from other items, referring to them using giXXX where XXX is grade item id ... eg something like: =sin(square([#gi20#])) + [#gi30#] |
| 17 | `gradetype` | smallint(4) | NO | `1` |  | 0 = none, 1 = value, 2 = scale, 3 = text |
| 18 | `grademax` | decimal(10,5) | NO | `100.00000` |  | What is the maximum allowable grade? |
| 19 | `grademin` | decimal(10,5) | NO | `0.00000` |  | What is the minimum allowable grade? |
| 20 | `scaleid` | bigint(10) | YES | `NULL` | MUL | If this grade is based on a scale, which one is it? |
| 21 | `outcomeid` | bigint(10) | YES | `NULL` | MUL | If this grade is related to an outcome, which one is it? |
| 22 | `gradepass` | decimal(10,5) | NO | `0.00000` |  | What grade is needed to pass? grademin &lt; gradepass &lt;= grademax |
| 23 | `multfactor` | decimal(10,5) | NO | `1.00000` |  | Multiply all grades by this |
| 24 | `plusfactor` | decimal(10,5) | NO | `0.00000` |  | Add this to all grades |
| 25 | `aggregationcoef` | decimal(10,5) | NO | `0.00000` |  | Aggregation coefficient used for category weights or other aggregation types |
| 26 | `aggregationcoef2` | decimal(10,5) | NO | `0.00000` |  | Aggregation coefficient used for category weights or other aggregation types |
| 27 | `sortorder` | bigint(10) | NO | `0` |  | Sorting order of the columns |
| 28 | `hidden` | bigint(10) | NO | `0` |  | 1 is hidden, &gt; 1 is a date to hide until (prevents viewing) |
| 29 | `locked` | bigint(10) | NO | `0` |  | 1 is locked, &gt; 1 is a date to lock until (prevents update) |
| 30 | `locktime` | bigint(10) | NO | `0` |  | lock all final grades after this date |
| 31 | `needsupdate` | bigint(10) | NO | `0` |  | If this flag is set, then the whole column will be recalculated |
| 32 | `display` | bigint(10) | NO | `0` |  |  |
| 33 | `decimals` | tinyint(1) | YES | `NULL` |  |  |
| 34 | `weightoverride` | tinyint(1) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `oldid` → `grade_items`(`id`)
- **FK** `courseid` → `course`(`id`)
- **FK** `categoryid` → `grade_categories`(`id`)
- **FK** `scaleid` → `scale`(`id`)
- **FK** `outcomeid` → `grade_outcomes`(`id`)
- **FK** `loggeduser` → `user`(`id`)
- **Index**: `action`
- **Index**: `timemodified`

### grade_letters

*Repository for grade letters, for courses and other moodle entities that use grades.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `contextid` | bigint(10) | NO |  | MUL | What contextid does this letter apply to (for now these will always be courses, but later...) |
| 3 | `lowerboundary` | decimal(10,5) | NO |  |  | The lower boundary of the letter. Its upper boundary is the lower boundary of the next highest letter, unless there is none above, in which case it's grademax for that grade_item. |
| 4 | `letter` | varchar(255) | NO | `''` |  | The display value of the letter. Can be any character or string of characters (OK, A, 10% etc..) |

**Keys & indexes**

- **Primary key:** `id`
- **Index** (unique): `contextid`, `lowerboundary`, `letter`

### grade_outcomes

*This table describes the outcomes used in the system. An outcome is a statement tied to a rubric scale from low to high, such as âNot met, Borderline, Metâ (stored as 0,1 or 2)*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | id of the table (auto-increment) |
| 2 | `courseid` | bigint(10) | YES | `NULL` | MUL | Mostly these are defined site wide ie NULL |
| 3 | `shortname` | varchar(255) | NO | `''` |  | The short name or code for this outcome statement |
| 4 | `fullname` | longtext | NO |  |  | The full description of the outcome (usually 1 sentence) |
| 5 | `scaleid` | bigint(10) | YES | `NULL` | MUL | The recommended scale for this outcome. |
| 6 | `description` | longtext | YES | `NULL` |  | outcome description |
| 7 | `descriptionformat` | tinyint(2) | NO | `0` |  |  |
| 8 | `timecreated` | bigint(10) | YES | `NULL` |  | the time this outcome was first created |
| 9 | `timemodified` | bigint(10) | YES | `NULL` |  | the time this outcome was last updated |
| 10 | `usermodified` | bigint(10) | YES | `NULL` | MUL | the userid of the person who last modified this outcome |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `courseid` → `course`(`id`)
- **FK** `scaleid` → `scale`(`id`)
- **FK** `usermodified` → `user`(`id`)
- **Unique:** `courseid`, `shortname`

### grade_outcomes_courses

*stores what outcomes are used in what courses.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `courseid` | bigint(10) | NO |  | MUL | id of the course |
| 3 | `outcomeid` | bigint(10) | NO |  | MUL | id of the outcome |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `courseid` → `course`(`id`)
- **FK** `outcomeid` → `grade_outcomes`(`id`)
- **Unique:** `courseid`, `outcomeid`

### grade_outcomes_history

*History table*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `action` | bigint(10) | NO | `0` | MUL | created/modified/deleted constants |
| 3 | `oldid` | bigint(10) | NO |  | MUL |  |
| 4 | `source` | varchar(255) | YES | `NULL` |  | What caused the modification? manual/module/import/... |
| 5 | `timemodified` | bigint(10) | YES | `NULL` | MUL | The last time this grade_item was modified |
| 6 | `loggeduser` | bigint(10) | YES | `NULL` | MUL | the userid of the person who last modified this outcome |
| 7 | `courseid` | bigint(10) | YES | `NULL` | MUL | Mostly these are defined site wide ie NULL |
| 8 | `shortname` | varchar(255) | NO | `''` |  | The short name or code for this outcome statement |
| 9 | `fullname` | longtext | NO |  |  | The full description of the outcome (usually 1 sentence) |
| 10 | `scaleid` | bigint(10) | YES | `NULL` | MUL | The recommended scale for this outcome. |
| 11 | `description` | longtext | YES | `NULL` |  | Outcome description |
| 12 | `descriptionformat` | tinyint(2) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `oldid` → `grade_outcomes`(`id`)
- **FK** `courseid` → `course`(`id`)
- **FK** `scaleid` → `scale`(`id`)
- **FK** `loggeduser` → `user`(`id`)
- **Index**: `action`
- **Index**: `timemodified`

### grade_settings

*gradebook settings*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `courseid` | bigint(10) | NO |  | MUL |  |
| 3 | `name` | varchar(255) | NO | `''` |  |  |
| 4 | `value` | longtext | YES | `NULL` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `courseid` → `course`(`id`)
- **Index** (unique): `courseid`, `name`

### gradepenalty_duedate_rule

*Penalty rules*

<sub>defined in `public/grade/penalty/duedate/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `contextid` | bigint(10) | NO |  | MUL | The context where the rule will be applied to |
| 3 | `sortorder` | bigint(10) | NO | `0` |  | Rule with lower late value will display first |
| 4 | `overdueby` | bigint(10) | NO |  |  | Overdue boundary |
| 5 | `penalty` | double(10,0) | NO |  |  | The deducted percentage will be applied the late submission |
| 6 | `usermodified` | bigint(10) | NO | `0` | MUL |  |
| 7 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 8 | `timemodified` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `usermodified` → `user`(`id`)
- **Index**: `contextid`

### grading_areas

*Identifies gradable areas where advanced grading can happen. For each area, the current active plugin can be set.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `contextid` | bigint(10) | NO |  | MUL | The context of the gradable area, eg module instance context. |
| 3 | `component` | varchar(100) | NO | `''` |  | Frankenstyle name of the component holding this area |
| 4 | `areaname` | varchar(100) | NO | `''` |  | The name of gradable area |
| 5 | `activemethod` | varchar(100) | YES | `NULL` |  | The default grading method (plugin) that should be used for this area |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `contextid` → `context`(`id`)
- **Unique:** `contextid`, `component`, `areaname`

### grading_definitions

*Contains the basic information about an advanced grading form defined in the given gradable area*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `areaid` | bigint(10) | NO |  | MUL |  |
| 3 | `method` | varchar(100) | NO | `''` |  | The name of the plugin providing this grading form |
| 4 | `name` | varchar(255) | NO | `''` |  | The title of the form that helps users to identify it |
| 5 | `description` | longtext | YES | `NULL` |  | More detailed description of the form |
| 6 | `descriptionformat` | tinyint(2) | YES | `NULL` |  | Format of the description field |
| 7 | `status` | bigint(10) | NO | `0` |  | Status of the form definition, by default in the under-construction state |
| 8 | `copiedfromid` | bigint(10) | YES | `NULL` |  | The id of the original definition that this was initially copied from or null if it was from scratch |
| 9 | `timecreated` | bigint(10) | NO |  |  | The timestamp of when the form definition was created initially |
| 10 | `usercreated` | bigint(10) | NO |  | MUL | The ID of the user who created this definition and is considered as its owner for access control purposes |
| 11 | `timemodified` | bigint(10) | NO |  |  | The time stamp of when the form definition was modified recently |
| 12 | `usermodified` | bigint(10) | NO |  | MUL | The ID of the user who did the most recent modification |
| 13 | `timecopied` | bigint(10) | YES | `0` |  | The timestamp of when this form was most recently copied into another area |
| 14 | `options` | longtext | YES | `NULL` |  | General field to be used by plugins as a general storage place for their own settings |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `areaid` → `grading_areas`(`id`)
- **FK** `usermodified` → `user`(`id`)
- **FK** `usercreated` → `user`(`id`)
- **Unique:** `areaid`, `method`

### grading_instances

*Grading form instance is an assessment record for one gradable item assessed by one rater*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `definitionid` | bigint(10) | NO |  | MUL | The ID of the form definition this is instance of |
| 3 | `raterid` | bigint(10) | NO |  | MUL | The ID of the user who did the assessment |
| 4 | `itemid` | bigint(10) | YES | `NULL` |  | This identifies the graded item within the grabable area |
| 5 | `rawgrade` | decimal(10,5) | YES | `NULL` |  | The raw normalized grade 0.00000 - 100.00000 as a result of the most recent assessment |
| 6 | `status` | bigint(10) | NO | `0` |  | The status of the assessment. By default the instance is under-assessment state |
| 7 | `feedback` | longtext | YES | `NULL` |  | Overall feedback from the rater for the author of the graded item |
| 8 | `feedbackformat` | tinyint(2) | YES | `NULL` |  | The format of the feedback field |
| 9 | `timemodified` | bigint(10) | NO |  |  | The timestamp of when the assessment was most recently modified |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `definitionid` → `grading_definitions`(`id`)
- **FK** `raterid` → `user`(`id`)

### gradingform_guide_comments

*frequently used comments used in marking guide*

<sub>defined in `public/grade/grading/form/guide/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `definitionid` | bigint(10) | NO |  | MUL | The ID of the form definition this faq is part of |
| 3 | `sortorder` | bigint(10) | NO |  |  | Defines the order of the comments |
| 4 | `description` | longtext | YES | `NULL` |  | The comment description |
| 5 | `descriptionformat` | tinyint(2) | YES | `NULL` |  | The format of the description field |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `definitionid` → `grading_definitions`(`id`)

### gradingform_guide_criteria

*Stores the rows of the criteria grid.*

<sub>defined in `public/grade/grading/form/guide/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `definitionid` | bigint(10) | NO |  | MUL | The ID of the form definition this criterion is part of |
| 3 | `sortorder` | bigint(10) | NO |  |  | Defines the order of the criterion in the guide |
| 4 | `shortname` | varchar(255) | NO | `''` |  | shortname of this criterion |
| 5 | `description` | longtext | YES | `NULL` |  | The criterion description for students |
| 6 | `descriptionformat` | tinyint(2) | YES | `NULL` |  | The format of the description field |
| 7 | `descriptionmarkers` | longtext | YES | `NULL` |  | Description for Markers |
| 8 | `descriptionmarkersformat` | tinyint(2) | YES | `NULL` |  |  |
| 9 | `maxscore` | decimal(10,5) | NO |  |  | maximum grade that can be assigned using this criterion |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `definitionid` → `grading_definitions`(`id`)

### gradingform_guide_fillings

*Stores the data of how the guide is filled by a particular rater*

<sub>defined in `public/grade/grading/form/guide/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `instanceid` | bigint(10) | NO |  | MUL | The ID of the grading form instance |
| 3 | `criterionid` | bigint(10) | NO |  | MUL | The ID of the criterion (row) in the guide |
| 4 | `remark` | longtext | YES | `NULL` |  | Side note feedback regarding this particular criterion |
| 5 | `remarkformat` | tinyint(2) | YES | `NULL` |  | The format of the remark field |
| 6 | `score` | decimal(10,5) | NO |  |  | The score assigned |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `instanceid` → `grading_instances`(`id`)
- **FK** `criterionid` → `gradingform_guide_criteria`(`id`)
- **Unique:** `instanceid`, `criterionid`

### gradingform_rubric_criteria

*Stores the rows of the rubric grid.*

<sub>defined in `public/grade/grading/form/rubric/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `definitionid` | bigint(10) | NO |  | MUL | The ID of the form definition this criterion is part of |
| 3 | `sortorder` | bigint(10) | NO |  |  | Defines the order of the criterion in the rubric |
| 4 | `description` | longtext | YES | `NULL` |  | The criterion description |
| 5 | `descriptionformat` | tinyint(2) | YES | `NULL` |  | The format of the description field |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `definitionid` → `grading_definitions`(`id`)

### gradingform_rubric_fillings

*Stores the data of how the rubric is filled by a particular rater*

<sub>defined in `public/grade/grading/form/rubric/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `instanceid` | bigint(10) | NO |  | MUL | The ID of the grading form instance |
| 3 | `criterionid` | bigint(10) | NO |  | MUL | The ID of the criterion (row) in the rubric |
| 4 | `levelid` | bigint(10) | YES | `NULL` | MUL | If a particular level was selected during the assessment, its ID is stored here |
| 5 | `remark` | longtext | YES | `NULL` |  | Side note feedback regarding this particular criterion |
| 6 | `remarkformat` | tinyint(2) | YES | `NULL` |  | The format of the remark field |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `instanceid` → `grading_instances`(`id`)
- **FK** `criterionid` → `gradingform_rubric_criteria`(`id`)
- **Unique:** `instanceid`, `criterionid`
- **Index**: `levelid`

### gradingform_rubric_levels

*Stores the columns of the rubric grid.*

<sub>defined in `public/grade/grading/form/rubric/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `criterionid` | bigint(10) | NO |  | MUL | The rubric criterion we are level of |
| 3 | `score` | decimal(10,5) | NO |  |  | The score for this level |
| 4 | `definition` | longtext | YES | `NULL` |  | The optional text describing the level |
| 5 | `definitionformat` | bigint(10) | YES | `NULL` |  | The format of the definition field |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `criterionid` → `gradingform_rubric_criteria`(`id`)

### groupings

*A grouping is a collection of groups. WAS: groups_groupings*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `courseid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `name` | varchar(255) | NO | `''` |  | Short human readable unique name for group. |
| 4 | `idnumber` | varchar(100) | NO | `''` | MUL |  |
| 5 | `description` | longtext | YES | `NULL` |  |  |
| 6 | `descriptionformat` | tinyint(2) | NO | `0` |  |  |
| 7 | `configdata` | longtext | YES | `NULL` |  | extra configuration data - may be used by group IU tools |
| 8 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 9 | `timemodified` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `courseid` → `course`(`id`)
- **Index**: `idnumber`

### groupings_groups

*Link a grouping to a group (note, groups can be in multiple groupings ONLY in a course). WAS: groups_groupings_groups*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `groupingid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `groupid` | bigint(10) | NO | `0` | MUL |  |
| 4 | `timeadded` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `groupingid` → `groupings`(`id`)
- **FK** `groupid` → `groups`(`id`)

### groups

*Each record represents a group.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `courseid` | bigint(10) | NO |  | MUL |  |
| 3 | `idnumber` | varchar(100) | NO | `''` | MUL |  |
| 4 | `name` | varchar(254) | NO | `''` |  | Short human readable unique name for the group. |
| 5 | `description` | longtext | YES | `NULL` |  |  |
| 6 | `descriptionformat` | tinyint(2) | NO | `0` |  |  |
| 7 | `enrolmentkey` | varchar(50) | YES | `NULL` |  |  |
| 8 | `picture` | bigint(10) | NO | `0` |  |  |
| 9 | `visibility` | tinyint(1) | NO | `0` |  | Visibility of group membership |
| 10 | `participation` | tinyint(1) | NO | `1` |  | Can this group be selected when participating in activities? |
| 11 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 12 | `timemodified` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `courseid` → `course`(`id`)
- **Index**: `idnumber`

### groups_members

*Link a user to a group.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `groupid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `userid` | bigint(10) | NO | `0` | MUL |  |
| 4 | `timeadded` | bigint(10) | NO | `0` |  |  |
| 5 | `component` | varchar(100) | NO | `''` |  | Defines the Moodle component which added this group membership (e.g. 'auth_myplugin'), or blank if it was added manually. (Entries which are created by a Moodle component cannot be removed in the normal user interface.) |
| 6 | `itemid` | bigint(10) | NO | `0` |  | If the 'component' field is set, this can be used to define the instance of the component that created the entry. Otherwise should be left as default (0). |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `groupid` → `groups`(`id`)
- **FK** `userid` → `user`(`id`)
- **Unique:** `userid`, `groupid`

### h5p

*Stores H5P content information*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `jsoncontent` | longtext | NO |  |  | The content in json format |
| 3 | `mainlibraryid` | bigint(10) | NO |  | MUL | The library we first instanciate for this node |
| 4 | `displayoptions` | smallint(4) | YES | `NULL` |  | H5P Button display options |
| 5 | `pathnamehash` | varchar(40) | NO | `''` | MUL | Defines the complete unique hash for the file path where the H5P content was added. |
| 6 | `contenthash` | varchar(40) | NO | `''` |  | Defines the hash for the file content. |
| 7 | `filtered` | longtext | YES | `NULL` |  | Filtered version of json_content |
| 8 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 9 | `timemodified` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `mainlibraryid` → `h5p_libraries`(`id`)
- **Index**: `pathnamehash`

### h5p_contents_libraries

*Store which library is used in which content.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `h5pid` | bigint(10) | NO |  | MUL | Identifier for the h5p content |
| 3 | `libraryid` | bigint(10) | NO |  | MUL | The identifier of a H5P library this content uses |
| 4 | `dependencytype` | varchar(10) | NO | `''` |  | dynamic, preloaded or editor |
| 5 | `dropcss` | tinyint(1) | NO |  |  | 1 if the preloaded css from the dependency is to be excluded |
| 6 | `weight` | bigint(10) | NO |  |  | Determines the order in which the preloaded libraries will be loaded |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `h5pid` → `h5p`(`id`)
- **FK** `libraryid` → `h5p_libraries`(`id`)

### h5p_libraries

*Stores information about libraries used by H5P content.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | Primary Key: The id of the library (auto-increment) |
| 2 | `machinename` | varchar(255) | NO | `''` | MUL | The library machine name |
| 3 | `title` | varchar(255) | NO | `''` |  | The human readable name of this library |
| 4 | `majorversion` | smallint(4) | NO |  |  |  |
| 5 | `minorversion` | smallint(4) | NO |  |  |  |
| 6 | `patchversion` | smallint(4) | NO |  |  |  |
| 7 | `runnable` | tinyint(1) | NO |  |  | Can this library be started by the module? i.e. not a dependency. |
| 8 | `fullscreen` | tinyint(1) | NO | `0` |  | Display fullscreen button |
| 9 | `embedtypes` | varchar(255) | NO | `''` |  | List of supported embed types |
| 10 | `preloadedjs` | longtext | YES | `NULL` |  | Comma separated list of scripts to load. |
| 11 | `preloadedcss` | longtext | YES | `NULL` |  | Comma separated list of stylesheets to load. |
| 12 | `droplibrarycss` | longtext | YES | `NULL` |  | List of libraries that should not have CSS included if this library is used. Comma separated list. |
| 13 | `semantics` | longtext | YES | `NULL` |  | The semantics definition in json format |
| 14 | `addto` | longtext | YES | `NULL` |  | Plugin configuration data |
| 15 | `coremajor` | smallint(4) | YES | `NULL` |  | H5P core API major version required |
| 16 | `coreminor` | smallint(4) | YES | `NULL` |  | H5P core API minor version required |
| 17 | `metadatasettings` | longtext | YES | `NULL` |  | Library metadata settings |
| 18 | `tutorial` | longtext | YES | `NULL` |  | Tutorial URL |
| 19 | `example` | longtext | YES | `NULL` |  | Example URL |
| 20 | `enabled` | tinyint(1) | YES | `1` |  | Defines if this library is enabled (1) or not (0) |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `machinename`, `majorversion`, `minorversion`, `patchversion`, `runnable`

### h5p_libraries_cachedassets

*H5P cached library assets*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `libraryid` | bigint(10) | NO |  | MUL |  |
| 3 | `hash` | varchar(255) | NO | `''` |  | Cache hash key that this library is part of. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `libraryid` → `h5p_libraries`(`id`)

### h5p_library_dependencies

*Stores H5P library dependencies*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `libraryid` | bigint(10) | NO |  | MUL | The id of a H5P library. |
| 3 | `requiredlibraryid` | bigint(10) | NO |  | MUL | The dependent library to load |
| 4 | `dependencytype` | varchar(255) | NO | `''` |  | preloaded, dynamic, or editor |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `libraryid` → `h5p_libraries`(`id`)
- **FK** `requiredlibraryid` → `h5p_libraries`(`id`)

### h5pactivity

*Stores the h5pactivity activity module instances.*

<sub>defined in `public/mod/h5pactivity/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `course` | bigint(10) | NO |  | MUL | ID of the course this activity is part of. |
| 3 | `name` | varchar(1333) | NO | `''` |  | The name of the activity module instance |
| 4 | `timecreated` | bigint(10) | NO |  |  | Timestamp of when the instance was added to the course. |
| 5 | `timemodified` | bigint(10) | NO |  |  | Timestamp of when the instance was last modified. |
| 6 | `intro` | longtext | YES | `NULL` |  | Activity description. |
| 7 | `introformat` | smallint(4) | NO | `0` |  | The format of the intro field. |
| 8 | `grade` | bigint(10) | YES | `0` |  |  |
| 9 | `displayoptions` | smallint(4) | NO | `0` |  | H5P Button display options |
| 10 | `enabletracking` | tinyint(1) | NO | `1` |  | Enable xAPI tracking |
| 11 | `grademethod` | smallint(4) | NO | `1` |  | Which H5P attempt is used for grading |
| 12 | `reviewmode` | smallint(4) | YES | `1` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `course` → `course`(`id`)

### h5pactivity_attempts

*Users attempts inside H5P activities*

<sub>defined in `public/mod/h5pactivity/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `h5pactivityid` | bigint(10) | NO |  | MUL | H5P activity ID |
| 3 | `userid` | bigint(20) | NO |  |  | Attempt user ID |
| 4 | `timecreated` | bigint(10) | NO |  | MUL |  |
| 5 | `timemodified` | bigint(10) | NO |  |  |  |
| 6 | `attempt` | mediumint(6) | NO | `1` |  | Attempt number |
| 7 | `rawscore` | bigint(10) | YES | `0` |  |  |
| 8 | `maxscore` | bigint(10) | YES | `0` |  |  |
| 9 | `scaled` | decimal(10,5) | NO | `0.00000` |  | Number 0..1 that reflects the performance of the learner |
| 10 | `duration` | bigint(10) | YES | `0` |  | Number of second inverted in that attempt (provided by the statement) |
| 11 | `completion` | tinyint(1) | YES | `NULL` |  | Store the xAPI tracking completion result. |
| 12 | `success` | tinyint(1) | YES | `NULL` |  | Store the xAPI tracking success result. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `h5pactivityid` → `h5pactivity`(`id`)
- **Unique:** `h5pactivityid`, `userid`, `attempt`
- **Index**: `timecreated`
- **Index**: `h5pactivityid`, `timecreated`
- **Index**: `h5pactivityid`, `userid`

### h5pactivity_attempts_results

*H5Pactivities_attempts tracking info*

<sub>defined in `public/mod/h5pactivity/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `attemptid` | bigint(10) | NO |  | MUL | h5pactivity_attempts ID |
| 3 | `subcontent` | varchar(128) | YES | `NULL` |  |  |
| 4 | `timecreated` | bigint(10) | NO |  |  |  |
| 5 | `interactiontype` | varchar(128) | YES | `NULL` |  |  |
| 6 | `description` | longtext | YES | `NULL` |  |  |
| 7 | `correctpattern` | longtext | YES | `NULL` |  | Correct Pattern in xAPI format |
| 8 | `response` | longtext | NO |  |  | User response data in xAPI format |
| 9 | `additionals` | longtext | YES | `NULL` |  | Extra subcontent information in JSON format |
| 10 | `rawscore` | bigint(10) | NO | `0` |  |  |
| 11 | `maxscore` | bigint(10) | NO | `0` |  |  |
| 12 | `duration` | bigint(10) | YES | `0` |  | Seconds inverted in this result (exctracted directly from statement) |
| 13 | `completion` | tinyint(1) | YES | `NULL` |  | Store the xAPI tracking completion result. |
| 14 | `success` | tinyint(1) | YES | `NULL` |  | Store the xAPI tracking success result. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `attemptid` → `h5pactivity_attempts`(`id`)
- **Index**: `attemptid`, `timecreated`

### imscp

*each record is one imscp resource*

<sub>defined in `public/mod/imscp/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `course` | bigint(10) | NO | `0` | MUL |  |
| 3 | `name` | varchar(1333) | NO | `''` |  |  |
| 4 | `intro` | longtext | YES | `NULL` |  |  |
| 5 | `introformat` | smallint(4) | NO | `0` |  |  |
| 6 | `revision` | bigint(10) | NO | `0` |  | incremented when after each file changes, solves browser caching issues |
| 7 | `keepold` | bigint(10) | NO | `-1` |  | incremented when after each file changes, solves browser caching issues |
| 8 | `structure` | longtext | YES | `NULL` |  |  |
| 9 | `timemodified` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `course`

### infected_files

*Table to store infected file details.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `filename` | longtext | NO |  |  | Original file name |
| 3 | `quarantinedfile` | longtext | YES | `NULL` |  | Quarantine zip file |
| 4 | `userid` | bigint(10) | NO |  | MUL | The user that uploaded the infected file. |
| 5 | `reason` | longtext | NO |  |  | The reason for the antivirus failure |
| 6 | `timecreated` | bigint(10) | NO | `0` |  | The time the infected file was uploaded. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)

### label

*Defines labels*

<sub>defined in `public/mod/label/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `course` | bigint(10) | NO | `0` | MUL |  |
| 3 | `name` | varchar(1333) | NO | `''` |  |  |
| 4 | `intro` | longtext | NO |  |  |  |
| 5 | `introformat` | smallint(4) | YES | `0` |  |  |
| 6 | `timemodified` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `course`

### lesson

*Defines lesson*

<sub>defined in `public/mod/lesson/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `course` | bigint(10) | NO | `0` | MUL |  |
| 3 | `name` | varchar(1333) | NO | `''` |  |  |
| 4 | `intro` | longtext | YES | `NULL` |  |  |
| 5 | `introformat` | smallint(4) | NO | `0` |  |  |
| 6 | `practice` | smallint(3) | NO | `0` |  |  |
| 7 | `modattempts` | smallint(3) | NO | `0` |  |  |
| 8 | `usepassword` | smallint(3) | NO | `0` |  |  |
| 9 | `password` | varchar(32) | NO | `''` |  |  |
| 10 | `dependency` | bigint(10) | NO | `0` |  |  |
| 11 | `conditions` | longtext | NO |  |  |  |
| 12 | `grade` | bigint(10) | NO | `0` |  |  |
| 13 | `custom` | smallint(3) | NO | `0` |  |  |
| 14 | `ongoing` | smallint(3) | NO | `0` |  |  |
| 15 | `usemaxgrade` | smallint(3) | NO | `0` |  |  |
| 16 | `maxanswers` | smallint(3) | NO | `4` |  |  |
| 17 | `maxattempts` | smallint(3) | NO | `5` |  |  |
| 18 | `review` | smallint(3) | NO | `0` |  |  |
| 19 | `nextpagedefault` | smallint(3) | NO | `0` |  |  |
| 20 | `feedback` | smallint(3) | NO | `1` |  |  |
| 21 | `minquestions` | smallint(3) | NO | `0` |  |  |
| 22 | `maxpages` | smallint(3) | NO | `0` |  |  |
| 23 | `timelimit` | bigint(10) | NO | `0` |  |  |
| 24 | `retake` | smallint(3) | NO | `1` |  |  |
| 25 | `activitylink` | bigint(10) | NO | `0` |  |  |
| 26 | `mediafile` | varchar(255) | NO | `''` |  | Local file path or full external URL |
| 27 | `mediaheight` | bigint(10) | NO | `100` |  |  |
| 28 | `mediawidth` | bigint(10) | NO | `650` |  |  |
| 29 | `mediaclose` | smallint(3) | NO | `0` |  |  |
| 30 | `slideshow` | smallint(3) | NO | `0` |  |  |
| 31 | `width` | bigint(10) | NO | `640` |  |  |
| 32 | `height` | bigint(10) | NO | `480` |  |  |
| 33 | `bgcolor` | varchar(7) | NO | `'#FFFFFF'` |  |  |
| 34 | `displayleft` | smallint(3) | NO | `0` |  |  |
| 35 | `displayleftif` | smallint(3) | NO | `0` |  |  |
| 36 | `progressbar` | smallint(3) | NO | `0` |  |  |
| 37 | `available` | bigint(10) | NO | `0` |  |  |
| 38 | `deadline` | bigint(10) | NO | `0` |  |  |
| 39 | `timemodified` | bigint(10) | NO | `0` |  |  |
| 40 | `completionendreached` | tinyint(1) | YES | `0` |  |  |
| 41 | `completiontimespent` | bigint(11) | YES | `0` |  |  |
| 42 | `allowofflineattempts` | tinyint(1) | YES | `0` |  | Whether to allow the lesson to be attempted offline in the mobile app |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `course`

### lesson_answers

*Defines lesson_answers*

<sub>defined in `public/mod/lesson/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `lessonid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `pageid` | bigint(10) | NO | `0` | MUL |  |
| 4 | `jumpto` | bigint(11) | NO | `0` |  |  |
| 5 | `grade` | smallint(4) | NO | `0` |  |  |
| 6 | `score` | bigint(10) | NO | `0` |  |  |
| 7 | `flags` | smallint(3) | NO | `0` |  |  |
| 8 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 9 | `timemodified` | bigint(10) | NO | `0` |  |  |
| 10 | `answer` | longtext | YES | `NULL` |  |  |
| 11 | `answerformat` | tinyint(2) | NO | `0` |  |  |
| 12 | `response` | longtext | YES | `NULL` |  |  |
| 13 | `responseformat` | tinyint(2) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `lessonid` → `lesson`(`id`)
- **FK** `pageid` → `lesson_pages`(`id`)

### lesson_attempts

*Defines lesson_attempts*

<sub>defined in `public/mod/lesson/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `lessonid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `pageid` | bigint(10) | NO | `0` | MUL |  |
| 4 | `userid` | bigint(10) | NO | `0` | MUL |  |
| 5 | `answerid` | bigint(10) | NO | `0` | MUL |  |
| 6 | `retry` | smallint(3) | NO | `0` |  |  |
| 7 | `correct` | bigint(10) | NO | `0` |  |  |
| 8 | `useranswer` | longtext | YES | `NULL` |  |  |
| 9 | `timeseen` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `lessonid` → `lesson`(`id`)
- **FK** `pageid` → `lesson_pages`(`id`)
- **FK** `answerid` → `lesson_answers`(`id`)
- **Index**: `userid`

### lesson_branch

*branches for each lesson/user*

<sub>defined in `public/mod/lesson/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `lessonid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `userid` | bigint(10) | NO | `0` | MUL |  |
| 4 | `pageid` | bigint(10) | NO | `0` | MUL |  |
| 5 | `retry` | bigint(10) | NO | `0` |  |  |
| 6 | `flag` | smallint(3) | NO | `0` |  |  |
| 7 | `timeseen` | bigint(10) | NO | `0` |  |  |
| 8 | `nextpageid` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `lessonid` → `lesson`(`id`)
- **FK** `pageid` → `lesson_pages`(`id`)
- **Index**: `userid`

### lesson_grades

*Defines lesson_grades*

<sub>defined in `public/mod/lesson/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `lessonid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `userid` | bigint(10) | NO | `0` | MUL |  |
| 4 | `grade` | double | NO | `0` |  |  |
| 5 | `late` | smallint(3) | NO | `0` |  |  |
| 6 | `completed` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `lessonid` → `lesson`(`id`)
- **Index**: `userid`

### lesson_overrides

*The overrides to lesson settings.*

<sub>defined in `public/mod/lesson/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `lessonid` | bigint(10) | NO | `0` | MUL | Foreign key references lesson.id |
| 3 | `groupid` | bigint(10) | YES | `NULL` | MUL | Foreign key references groups.id.  Can be null if this is a per-user override. |
| 4 | `userid` | bigint(10) | YES | `NULL` | MUL | Foreign key references user.id.  Can be null if this is a per-group override. |
| 5 | `available` | bigint(10) | YES | `NULL` |  | Time at which students may start attempting this lesson. Can be null, in which case the lesson default is used. |
| 6 | `deadline` | bigint(10) | YES | `NULL` |  | Time by which students must have completed their attempt.  Can be null, in which case the lesson default is used. |
| 7 | `timelimit` | bigint(10) | YES | `NULL` |  | Time limit in seconds.  Can be null, in which case the lesson default is used. |
| 8 | `review` | smallint(3) | YES | `NULL` |  |  |
| 9 | `maxattempts` | smallint(3) | YES | `NULL` |  |  |
| 10 | `retake` | smallint(3) | YES | `NULL` |  |  |
| 11 | `password` | varchar(32) | YES | `NULL` |  | Lesson password.  Can be null, in which case the lesson default is used. |
| 12 | `reason` | longtext | YES | `NULL` |  | An optional reason explaining why this override was granted. |
| 13 | `reasonformat` | tinyint(2) | NO | `0` |  | The internal format for the override reason. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `lessonid` → `lesson`(`id`)
- **FK** `groupid` → `groups`(`id`)
- **FK** `userid` → `user`(`id`)

### lesson_pages

*Defines lesson_pages*

<sub>defined in `public/mod/lesson/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `lessonid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `prevpageid` | bigint(10) | NO | `0` |  |  |
| 4 | `nextpageid` | bigint(10) | NO | `0` |  |  |
| 5 | `qtype` | smallint(3) | NO | `0` |  |  |
| 6 | `qoption` | smallint(3) | NO | `0` |  |  |
| 7 | `layout` | smallint(3) | NO | `1` |  |  |
| 8 | `display` | smallint(3) | NO | `1` |  |  |
| 9 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 10 | `timemodified` | bigint(10) | NO | `0` |  |  |
| 11 | `title` | varchar(255) | NO | `''` |  |  |
| 12 | `contents` | longtext | NO |  |  |  |
| 13 | `contentsformat` | tinyint(2) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `lessonid` → `lesson`(`id`)

### lesson_timer

*lesson timer for each lesson*

<sub>defined in `public/mod/lesson/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `lessonid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `userid` | bigint(10) | NO | `0` | MUL |  |
| 4 | `starttime` | bigint(10) | NO | `0` |  |  |
| 5 | `lessontime` | bigint(10) | NO | `0` |  |  |
| 6 | `completed` | tinyint(1) | YES | `0` |  |  |
| 7 | `timemodifiedoffline` | bigint(10) | NO | `0` |  | Last modified time via web services (mobile app). |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `lessonid` → `lesson`(`id`)
- **Index**: `userid`

### license

*store licenses used by moodle*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `shortname` | varchar(255) | YES | `NULL` |  |  |
| 3 | `fullname` | longtext | YES | `NULL` |  |  |
| 4 | `source` | varchar(255) | YES | `NULL` |  |  |
| 5 | `enabled` | tinyint(1) | NO | `1` |  |  |
| 6 | `version` | bigint(10) | NO | `0` |  |  |
| 7 | `custom` | tinyint(1) | NO | `0` |  | If this flag is set, license is custom and can be updated or deleted, otherwise license is a core license and cannot be edited. |
| 8 | `sortorder` | mediumint(5) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`

### lock_db

*Stores active and inactive lock types for db locking method.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `resourcekey` | varchar(255) | NO | `''` | UNI | String identifying the resource to be locked. Should use frankenstyle format. |
| 3 | `expires` | bigint(10) | YES | `NULL` | MUL | Expiry time for an active lock. |
| 4 | `owner` | varchar(36) | YES | `NULL` | MUL | uuid indicating the owner of the lock. |

**Keys & indexes**

- **Primary key:** `id`
- **Index** (unique): `resourcekey`
- **Index**: `expires`
- **Index**: `owner`

### log

*Every action is logged as far as possible*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `time` | bigint(10) | NO | `0` | MUL |  |
| 3 | `userid` | bigint(10) | NO | `0` | MUL |  |
| 4 | `ip` | varchar(45) | NO | `''` |  |  |
| 5 | `course` | bigint(10) | NO | `0` | MUL |  |
| 6 | `module` | varchar(20) | NO | `''` |  |  |
| 7 | `cmid` | bigint(10) | NO | `0` | MUL |  |
| 8 | `action` | varchar(40) | NO | `''` | MUL |  |
| 9 | `url` | varchar(100) | NO | `''` |  |  |
| 10 | `info` | varchar(255) | NO | `''` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `course`, `module`, `action`
- **Index**: `time`
- **Index**: `action`
- **Index**: `userid`, `course`
- **Index**: `cmid`

### log_display

*For a particular module/action, specifies a moodle table/field*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `module` | varchar(20) | NO | `''` | MUL |  |
| 3 | `action` | varchar(40) | NO | `''` |  |  |
| 4 | `mtable` | varchar(30) | NO | `''` |  |  |
| 5 | `field` | varchar(200) | NO | `''` |  |  |
| 6 | `component` | varchar(100) | NO | `''` |  | owner of the log action |

**Keys & indexes**

- **Primary key:** `id`
- **Index** (unique): `module`, `action`

### log_queries

*Logged database queries.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `qtype` | mediumint(5) | NO |  |  | query type constant |
| 3 | `sqltext` | longtext | NO |  |  | query sql |
| 4 | `sqlparams` | longtext | YES | `NULL` |  | query parameters |
| 5 | `error` | mediumint(5) | NO | `0` |  | is error |
| 6 | `info` | longtext | YES | `NULL` |  | detailed info such as error text |
| 7 | `backtrace` | longtext | YES | `NULL` |  | php execution trace |
| 8 | `exectime` | decimal(10,5) | NO |  |  | query execution time in seconds as float |
| 9 | `timelogged` | bigint(10) | NO |  |  | timestamp when log info stored into db |

**Keys & indexes**

- **Primary key:** `id`

### logstore_standard_log

*Standard log table*

<sub>defined in `public/admin/tool/log/store/standard/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `eventname` | varchar(255) | NO | `''` |  |  |
| 3 | `component` | varchar(100) | NO | `''` |  |  |
| 4 | `action` | varchar(100) | NO | `''` |  |  |
| 5 | `target` | varchar(100) | NO | `''` |  |  |
| 6 | `objecttable` | varchar(50) | YES | `NULL` |  |  |
| 7 | `objectid` | bigint(10) | YES | `NULL` |  |  |
| 8 | `crud` | varchar(1) | NO | `''` |  |  |
| 9 | `edulevel` | tinyint(1) | NO |  |  |  |
| 10 | `contextid` | bigint(10) | NO |  | MUL |  |
| 11 | `contextlevel` | bigint(10) | NO |  |  |  |
| 12 | `contextinstanceid` | bigint(10) | NO |  |  |  |
| 13 | `userid` | bigint(10) | NO |  | MUL |  |
| 14 | `courseid` | bigint(10) | YES | `NULL` | MUL |  |
| 15 | `relateduserid` | bigint(10) | YES | `NULL` | MUL |  |
| 16 | `anonymous` | tinyint(1) | NO | `0` |  | Was this event anonymous at the time of triggering? |
| 17 | `other` | longtext | YES | `NULL` |  |  |
| 18 | `timecreated` | bigint(10) | NO |  | MUL |  |
| 19 | `origin` | varchar(10) | YES | `NULL` |  | cli, cron, ws, etc. |
| 20 | `ip` | varchar(45) | YES | `NULL` |  | IP address |
| 21 | `realuserid` | bigint(10) | YES | `NULL` | MUL | real user id when logged-in-as |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `contextid` → `context`(`id`)
- **FK** `userid` → `user`(`id`)
- **FK** `courseid` → `course`(`id`)
- **FK** `realuserid` → `user`(`id`)
- **FK** `relateduserid` → `user`(`id`)
- **Index**: `timecreated`
- **Index**: `courseid`, `anonymous`, `timecreated`
- **Index**: `userid`, `contextlevel`, `contextinstanceid`, `crud`, `edulevel`, `timecreated`

### lti

*This table contains Basic LTI activities instances*

<sub>defined in `public/mod/lti/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `course` | bigint(10) | NO | `0` | MUL | Course basiclti activity belongs to |
| 3 | `name` | varchar(1333) | NO | `''` |  | name field for moodle instances |
| 4 | `intro` | longtext | YES | `NULL` |  | General introduction of the basiclti activity |
| 5 | `introformat` | smallint(4) | YES | `0` |  | Format of the intro field (MOODLE, HTML, MARKDOWN...) |
| 6 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 7 | `timemodified` | bigint(10) | NO | `0` |  |  |
| 8 | `typeid` | bigint(10) | YES | `NULL` |  | Basic LTI type |
| 9 | `toolurl` | longtext | NO |  |  | Remote tool url |
| 10 | `securetoolurl` | longtext | YES | `NULL` |  |  |
| 11 | `instructorchoicesendname` | tinyint(1) | YES | `NULL` |  | Send user's name |
| 12 | `instructorchoicesendemailaddr` | tinyint(1) | YES | `NULL` |  | Send user's email |
| 13 | `instructorchoiceallowroster` | tinyint(1) | YES | `NULL` |  | Allow the roster to be retrieved |
| 14 | `instructorchoiceallowsetting` | tinyint(1) | YES | `NULL` |  | Allow a tool to store a setting |
| 15 | `instructorcustomparameters` | longtext | YES | `NULL` |  | Additional custom parameters provided by the instructor |
| 16 | `instructorchoiceacceptgrades` | tinyint(1) | YES | `NULL` |  | Accept grades from tool |
| 17 | `grade` | bigint(10) | NO | `100` |  | Grade scale |
| 18 | `launchcontainer` | tinyint(2) | NO | `1` |  | Launch external tool in a pop-up |
| 19 | `resourcekey` | varchar(255) | YES | `NULL` |  |  |
| 20 | `password` | varchar(255) | YES | `NULL` |  |  |
| 21 | `debuglaunch` | tinyint(1) | NO | `0` |  | Enable the debug-style launch which pauses before auto-submit |
| 22 | `showtitlelaunch` | tinyint(1) | NO | `0` |  |  |
| 23 | `showdescriptionlaunch` | tinyint(1) | NO | `0` |  |  |
| 24 | `servicesalt` | varchar(40) | YES | `NULL` |  |  |
| 25 | `icon` | longtext | YES | `NULL` |  |  |
| 26 | `secureicon` | longtext | YES | `NULL` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `course`

### lti_access_tokens

*Security tokens for accessing of LTI services*

<sub>defined in `public/mod/lti/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `typeid` | bigint(10) | NO |  | MUL | Basic LTI type id |
| 3 | `scope` | longtext | NO |  |  | Scope values as JSON array |
| 4 | `token` | varchar(128) | NO | `''` | UNI | security token, aka private access key |
| 5 | `validuntil` | bigint(10) | NO |  |  | timestamp - valid until data |
| 6 | `timecreated` | bigint(10) | NO |  |  | created timestamp |
| 7 | `lastaccess` | bigint(10) | YES | `NULL` |  | last access timestamp |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `typeid` → `lti_types`(`id`)
- **Index** (unique): `token`

### lti_coursevisible

*Table to store coursevisible setting for site tool on course level*

<sub>defined in `public/mod/lti/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `typeid` | bigint(10) | NO |  | MUL |  |
| 3 | `courseid` | bigint(10) | NO |  | MUL | Course ID |
| 4 | `coursevisible` | tinyint(1) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `courseid`
- **Index**: `typeid`

### lti_submission

*Keeps track of individual submissions for LTI activities.*

<sub>defined in `public/mod/lti/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `ltiid` | bigint(10) | NO |  | MUL | ID of the LTI tool instance |
| 3 | `userid` | bigint(10) | NO |  |  |  |
| 4 | `datesubmitted` | bigint(10) | NO |  |  |  |
| 5 | `dateupdated` | bigint(10) | NO |  |  |  |
| 6 | `gradepercent` | decimal(10,5) | NO |  |  |  |
| 7 | `originalgrade` | decimal(10,5) | NO |  |  |  |
| 8 | `launchid` | bigint(10) | NO |  |  |  |
| 9 | `state` | tinyint(2) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `ltiid`

### lti_tool_proxies

*LTI tool proxy registrations*

<sub>defined in `public/mod/lti/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `name` | varchar(255) | NO | `'Tool Provider'` |  | Tool Provider name |
| 3 | `regurl` | longtext | YES | `NULL` |  |  |
| 4 | `state` | tinyint(2) | NO | `1` |  | Configured = 1, Pending = 2, Accepted = 3, Rejected = 4, Cancelled = 5 |
| 5 | `guid` | varchar(255) | YES | `NULL` | UNI |  |
| 6 | `secret` | varchar(255) | YES | `NULL` |  |  |
| 7 | `vendorcode` | varchar(255) | YES | `NULL` |  |  |
| 8 | `capabilityoffered` | longtext | NO |  |  | List of capabilities offered, one per line |
| 9 | `serviceoffered` | longtext | NO |  |  | List of services offered, one per line |
| 10 | `toolproxy` | longtext | YES | `NULL` |  | JSON string representing tool proxy returned by tool provider |
| 11 | `createdby` | bigint(10) | NO |  |  | ID of user which initiated the registration process |
| 12 | `timecreated` | bigint(10) | NO |  |  | Date/time at which the record was created |
| 13 | `timemodified` | bigint(10) | NO |  |  | Date/time at which the record was last modified |

**Keys & indexes**

- **Primary key:** `id`
- **Index** (unique): `guid`

### lti_tool_settings

*LTI tool setting values*

<sub>defined in `public/mod/lti/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `toolproxyid` | bigint(10) | NO |  | MUL | Primary key of related tool proxy |
| 3 | `typeid` | bigint(10) | YES | `NULL` | MUL |  |
| 4 | `course` | bigint(10) | YES | `NULL` | MUL | Primary key of course (null for system-wide settings) |
| 5 | `coursemoduleid` | bigint(10) | YES | `NULL` | MUL | Primary key of course module - tool link added to course (null for system-wide and context-wide settings) |
| 6 | `settings` | longtext | NO |  |  | Setting values as JSON |
| 7 | `timecreated` | bigint(10) | NO |  |  | Date/time at which the record was created |
| 8 | `timemodified` | bigint(10) | NO |  |  | Date/time at which the record was last modified |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `toolproxyid` → `lti_tool_proxies`(`id`)
- **FK** `typeid` → `lti_types`(`id`)
- **FK** `course` → `course`(`id`)
- **FK** `coursemoduleid` → `lti`(`id`)

### lti_types

*Basic LTI pre-configured activities*

<sub>defined in `public/mod/lti/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `name` | varchar(255) | NO | `'basiclti Activity'` |  | Activity name |
| 3 | `baseurl` | longtext | NO |  |  |  |
| 4 | `tooldomain` | varchar(255) | NO | `''` | MUL |  |
| 5 | `state` | tinyint(2) | NO | `2` |  | Active = 1, Pending = 2, Rejected = 3 |
| 6 | `course` | bigint(10) | NO |  | MUL |  |
| 7 | `coursevisible` | tinyint(1) | NO | `0` |  |  |
| 8 | `ltiversion` | varchar(10) | NO | `''` |  |  |
| 9 | `clientid` | varchar(255) | YES | `NULL` | UNI |  |
| 10 | `toolproxyid` | bigint(10) | YES | `NULL` |  | Primary key of related tool proxy (null for LTI 1 tools) |
| 11 | `enabledcapability` | longtext | YES | `NULL` |  | Enabled capabilities, one per line (null for LTI 1 tools) |
| 12 | `parameter` | longtext | YES | `NULL` |  | Launch parameters, one per line (null for LTI 1 tools) |
| 13 | `icon` | longtext | YES | `NULL` |  | URL to icon file |
| 14 | `secureicon` | longtext | YES | `NULL` |  | Secure URL to icon file |
| 15 | `createdby` | bigint(10) | NO |  |  |  |
| 16 | `timecreated` | bigint(10) | NO |  |  |  |
| 17 | `timemodified` | bigint(10) | NO |  |  |  |
| 18 | `description` | longtext | YES | `NULL` |  | A description of what this LTI module is. |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `course`
- **Index**: `tooldomain`
- **Index** (unique): `clientid`

### lti_types_categories

*Link LTI types to course categories*

<sub>defined in `public/mod/lti/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `typeid` | bigint(10) | NO |  | MUL |  |
| 3 | `categoryid` | bigint(10) | NO |  | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `typeid` → `lti_types`(`id`)
- **FK** `categoryid` → `course_categories`(`id`)

### lti_types_config

*Basic LTI types configuration*

<sub>defined in `public/mod/lti/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `typeid` | bigint(10) | NO |  | MUL | Basic LTI type id |
| 3 | `name` | varchar(100) | NO | `''` |  | Basic LTI param |
| 4 | `value` | longtext | NO |  |  | Param value |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `typeid`

### ltiservice_gradebookservices

*This file records the grade items created by the LTI Gradebook Services service*

<sub>defined in `public/mod/lti/service/gradebookservices/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `gradeitemid` | bigint(10) | NO |  | MUL | ID of the gradeItem related. |
| 3 | `courseid` | bigint(10) | NO |  |  | ID of the course related. |
| 4 | `toolproxyid` | bigint(10) | YES | `NULL` |  | ID of the Tool Proxy instance. |
| 5 | `typeid` | bigint(10) | YES | `NULL` |  | ID of the LTI Type if not Proxy. |
| 6 | `baseurl` | longtext | YES | `NULL` |  | Lineitem URL that will be returned to the Tool provider |
| 7 | `ltilinkid` | bigint(10) | YES | `NULL` | MUL | ID of the LTI element related with this lineitem. |
| 8 | `resourceid` | varchar(512) | YES | `NULL` |  | Resource id for the line item |
| 9 | `tag` | varchar(255) | YES | `NULL` |  | Tag type specified for the line item |
| 10 | `subreviewurl` | longtext | YES | `NULL` |  | Submission review URL |
| 11 | `subreviewparams` | longtext | YES | `NULL` |  | Submission review custom params |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `ltilinkid` → `lti`(`id`)
- **FK** `gradeitemid`, `courseid` → `grade_items`(`id`, `courseid`)

### matrix_room

*Stores the matrix room information associated with the communication instance.*

<sub>defined in `public/communication/provider/matrix/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `commid` | bigint(10) | NO |  | MUL | ID of the communication record |
| 3 | `roomid` | varchar(255) | YES | `NULL` |  | ID of the matrix room instance |
| 4 | `topic` | varchar(255) | YES | `NULL` |  | Topic of the matrix room instance. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `commid` → `communication`(`id`)

### message

*Stores all unread messages*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `useridfrom` | bigint(10) | NO | `0` | MUL |  |
| 3 | `useridto` | bigint(10) | NO | `0` | MUL |  |
| 4 | `subject` | longtext | YES | `NULL` |  | The message subject |
| 5 | `fullmessage` | longtext | YES | `NULL` |  |  |
| 6 | `fullmessageformat` | smallint(4) | YES | `0` |  | The format of the full message |
| 7 | `fullmessagehtml` | longtext | YES | `NULL` |  | html format of message |
| 8 | `smallmessage` | longtext | YES | `NULL` |  | Smal version of message (eg sms) |
| 9 | `notification` | tinyint(1) | YES | `0` |  |  |
| 10 | `contexturl` | longtext | YES | `NULL` |  | If this message is a notification of an event contexturl should contain a link to view this event. For example if its a notification of a forum post contexturl should contain a link to the forum post. |
| 11 | `contexturlname` | longtext | YES | `NULL` |  | Display text for the contexturl |
| 12 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 13 | `timeuserfromdeleted` | bigint(10) | NO | `0` |  |  |
| 14 | `timeusertodeleted` | bigint(10) | NO | `0` |  |  |
| 15 | `component` | varchar(100) | YES | `NULL` |  |  |
| 16 | `eventtype` | varchar(100) | YES | `NULL` |  |  |
| 17 | `customdata` | longtext | YES | `NULL` |  | Custom data to be passed to the message processor. Must be serialisable using json_encode() |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `useridfrom`, `useridto`, `timeuserfromdeleted`, `timeusertodeleted`
- **Index**: `useridfrom`, `timeuserfromdeleted`, `notification`
- **Index**: `useridto`, `timeusertodeleted`, `notification`

### message_airnotifier_devices

*Store information about the devices registered in Airnotifier for PUSH notifications*

<sub>defined in `public/message/output/airnotifier/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userdeviceid` | bigint(10) | NO |  | UNI | The user device id in the user_devices table |
| 3 | `enable` | tinyint(1) | NO | `1` |  | The user can enable/disable his devices |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userdeviceid` → `user_devices`(`id`) *(unique)*

### message_contact_requests

*Maintains list of contact requests between users*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO |  | MUL |  |
| 3 | `requesteduserid` | bigint(10) | NO |  | MUL |  |
| 4 | `timecreated` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)
- **FK** `requesteduserid` → `user`(`id`)
- **Index** (unique): `userid`, `requesteduserid`

### message_contacts

*Maintains lists of contacts between users*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO |  | MUL |  |
| 3 | `contactid` | bigint(10) | NO |  | MUL |  |
| 4 | `timecreated` | bigint(10) | YES | `NULL` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)
- **FK** `contactid` → `user`(`id`)
- **Index** (unique): `userid`, `contactid`

### message_conversation_actions

*Stores all per-user actions on individual conversations*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO |  | MUL |  |
| 3 | `conversationid` | bigint(10) | NO |  | MUL |  |
| 4 | `action` | bigint(10) | NO |  |  |  |
| 5 | `timecreated` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)
- **FK** `conversationid` → `message_conversations`(`id`)

### message_conversation_members

*Stores all members in a conversations*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `conversationid` | bigint(10) | NO |  | MUL |  |
| 3 | `userid` | bigint(10) | NO |  | MUL |  |
| 4 | `timecreated` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `conversationid` → `message_conversations`(`id`)
- **FK** `userid` → `user`(`id`)

### message_conversations

*Stores all message conversations*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `type` | bigint(10) | NO | `1` | MUL |  |
| 3 | `name` | varchar(255) | YES | `NULL` |  |  |
| 4 | `convhash` | varchar(40) | YES | `NULL` | MUL |  |
| 5 | `component` | varchar(100) | YES | `NULL` | MUL | Defines the Moodle component which the area was added to |
| 6 | `itemtype` | varchar(100) | YES | `NULL` |  |  |
| 7 | `itemid` | bigint(10) | YES | `NULL` |  |  |
| 8 | `contextid` | bigint(10) | YES | `NULL` | MUL | The context id of the itemid or course of the itemtype was added |
| 9 | `enabled` | tinyint(1) | NO | `0` |  |  |
| 10 | `timecreated` | bigint(10) | NO |  |  |  |
| 11 | `timemodified` | bigint(10) | YES | `NULL` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `contextid` → `context`(`id`)
- **Index**: `type`
- **Index**: `convhash`
- **Index**: `component`, `itemtype`, `itemid`, `contextid`

### message_email_messages

*Keeps track of what emails to send in an email digest*

<sub>defined in `public/message/output/email/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `useridto` | bigint(10) | NO |  | MUL |  |
| 3 | `conversationid` | bigint(10) | NO |  | MUL |  |
| 4 | `messageid` | bigint(10) | NO |  | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `useridto` → `user`(`id`)
- **FK** `conversationid` → `message_conversations`(`id`)
- **FK** `messageid` → `messages`(`id`)

### message_popup

*Keep state of notifications for the popup message processor*

<sub>defined in `public/message/output/popup/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `messageid` | bigint(10) | NO |  | MUL |  |
| 3 | `isread` | tinyint(1) | NO | `0` | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index** (unique): `messageid`, `isread`
- **Index**: `isread`

### message_popup_notifications

*List of notifications to display in the message output popup*

<sub>defined in `public/message/output/popup/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `notificationid` | bigint(10) | NO |  | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `notificationid` → `notifications`(`id`)

### message_processors

*List of message output plugins*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `name` | varchar(166) | NO | `''` |  | Name of the message processor |
| 3 | `enabled` | tinyint(1) | NO | `1` |  | Defines if processor is enabled |

**Keys & indexes**

- **Primary key:** `id`

### message_providers

*This table stores the message providers (modules and core systems)*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | id of the table, please edit me (auto-increment) |
| 2 | `name` | varchar(100) | NO | `''` |  | The full name of the message provider in standard form |
| 3 | `component` | varchar(200) | NO | `''` | MUL | The name of the component that produces these messages |
| 4 | `capability` | varchar(255) | YES | `NULL` |  | Optional: permission that is required on the user's setting screen to see this message provider. |

**Keys & indexes**

- **Primary key:** `id`
- **Index** (unique): `component`, `name`

### message_read

*Stores all messages that have been read*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `useridfrom` | bigint(10) | NO | `0` | MUL |  |
| 3 | `useridto` | bigint(10) | NO | `0` | MUL |  |
| 4 | `subject` | longtext | YES | `NULL` |  | The message subject |
| 5 | `fullmessage` | longtext | YES | `NULL` |  |  |
| 6 | `fullmessageformat` | smallint(4) | YES | `0` |  | The format of the full message |
| 7 | `fullmessagehtml` | longtext | YES | `NULL` |  | html format of message |
| 8 | `smallmessage` | longtext | YES | `NULL` |  | Smal version of message (eg sms) |
| 9 | `notification` | tinyint(1) | YES | `0` | MUL |  |
| 10 | `contexturl` | longtext | YES | `NULL` |  | If this message is a notification of an event contexturl should contain a link to view this event. For example if its a notification of a forum post contexturl should contain a link to the forum post. |
| 11 | `contexturlname` | longtext | YES | `NULL` |  | Display text for the contexturl |
| 12 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 13 | `timeread` | bigint(10) | NO | `0` |  |  |
| 14 | `timeuserfromdeleted` | bigint(10) | NO | `0` |  |  |
| 15 | `timeusertodeleted` | bigint(10) | NO | `0` |  |  |
| 16 | `component` | varchar(100) | YES | `NULL` |  |  |
| 17 | `eventtype` | varchar(100) | YES | `NULL` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `useridfrom`, `useridto`, `timeuserfromdeleted`, `timeusertodeleted`
- **Index**: `notification`, `timeread`
- **Index**: `useridfrom`, `timeuserfromdeleted`, `notification`
- **Index**: `useridto`, `timeusertodeleted`, `notification`

### message_user_actions

*Stores all per-user actions on individual messages*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO |  | MUL |  |
| 3 | `messageid` | bigint(10) | NO |  | MUL |  |
| 4 | `action` | bigint(10) | NO |  |  |  |
| 5 | `timecreated` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)
- **FK** `messageid` → `messages`(`id`)
- **Index** (unique): `userid`, `messageid`, `action`

### message_users_blocked

*Maintains lists of blocked users*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO |  | MUL |  |
| 3 | `blockeduserid` | bigint(10) | NO |  | MUL |  |
| 4 | `timecreated` | bigint(10) | YES | `NULL` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)
- **FK** `blockeduserid` → `user`(`id`)
- **Index** (unique): `userid`, `blockeduserid`

### messageinbound_datakeys

*Inbound Message data item secret keys.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `handler` | bigint(10) | NO |  | MUL | The handler that this key belongs to. |
| 3 | `datavalue` | bigint(10) | NO |  |  | The integer value of the data item that this key belongs to. |
| 4 | `datakey` | varchar(64) | YES | `NULL` |  | The secret key for this data item. |
| 5 | `timecreated` | bigint(10) | NO |  |  | The time that the data key was created. |
| 6 | `expires` | bigint(10) | YES | `NULL` |  | The expiry time of this key. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `handler` → `messageinbound_handlers`(`id`)
- **Unique:** `handler`, `datavalue`

### messageinbound_handlers

*Inbound Message Handler definitions.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `component` | varchar(100) | NO | `''` |  | The component this handler belongs to. |
| 3 | `classname` | varchar(255) | NO | `''` | UNI | The class defining the Inbound Message handler to be called. |
| 4 | `defaultexpiration` | bigint(10) | NO | `86400` |  | The default expiration period to use when creating a new key |
| 5 | `validateaddress` | tinyint(1) | NO | `1` |  | Whether to validate the sender address against the user record. |
| 6 | `enabled` | tinyint(1) | NO | `0` |  | Whether this handler is currently enabled. |

**Keys & indexes**

- **Primary key:** `id`
- **Unique:** `classname`

### messageinbound_messagelist

*A list of message IDs for existing replies*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `messageid` | longtext | NO |  |  |  |
| 3 | `userid` | bigint(10) | NO |  | MUL |  |
| 4 | `address` | longtext | NO |  |  | The Inbound Message address that the message was originally sent to |
| 5 | `timecreated` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)

### messages

*Stores all messages*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `useridfrom` | bigint(10) | NO |  | MUL |  |
| 3 | `conversationid` | bigint(10) | NO |  | MUL |  |
| 4 | `subject` | longtext | YES | `NULL` |  |  |
| 5 | `fullmessage` | longtext | YES | `NULL` |  |  |
| 6 | `fullmessageformat` | tinyint(1) | NO | `0` |  |  |
| 7 | `fullmessagehtml` | longtext | YES | `NULL` |  |  |
| 8 | `smallmessage` | longtext | YES | `NULL` |  |  |
| 9 | `timecreated` | bigint(10) | NO |  |  |  |
| 10 | `fullmessagetrust` | tinyint(2) | NO | `0` |  |  |
| 11 | `customdata` | longtext | YES | `NULL` |  | Custom data to be passed to the message processor. Must be serialisable using json_encode() |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `useridfrom` → `user`(`id`)
- **FK** `conversationid` → `message_conversations`(`id`)
- **Index**: `conversationid`, `timecreated`

### mnet_application

*Information about applications on remote hosts*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `name` | varchar(50) | NO | `''` |  |  |
| 3 | `display_name` | varchar(50) | NO | `''` |  |  |
| 4 | `xmlrpc_server_url` | varchar(255) | NO | `''` |  |  |
| 5 | `sso_land_url` | varchar(255) | NO | `''` |  |  |
| 6 | `sso_jump_url` | varchar(255) | NO | `''` |  |  |

**Keys & indexes**

- **Primary key:** `id`

### mnet_host

*Information about the local and remote hosts for RPC*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | Unique Host ID (auto-increment) |
| 2 | `deleted` | tinyint(1) | NO | `0` |  |  |
| 3 | `wwwroot` | varchar(255) | NO | `''` |  |  |
| 4 | `ip_address` | varchar(45) | NO | `''` |  |  |
| 5 | `name` | varchar(80) | NO | `''` |  |  |
| 6 | `public_key` | longtext | NO |  |  |  |
| 7 | `public_key_expires` | bigint(10) | NO | `0` |  |  |
| 8 | `transport` | tinyint(2) | NO | `0` |  |  |
| 9 | `portno` | mediumint(5) | NO | `0` |  |  |
| 10 | `last_connect_time` | bigint(10) | NO | `0` |  |  |
| 11 | `last_log_id` | bigint(10) | NO | `0` | MUL |  |
| 12 | `force_theme` | tinyint(1) | NO | `0` |  |  |
| 13 | `theme` | varchar(100) | YES | `NULL` |  |  |
| 14 | `applicationid` | bigint(10) | NO | `1` | MUL |  |
| 15 | `sslverification` | tinyint(1) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `applicationid` → `mnet_application`(`id`)
- **Index**: `last_log_id`

### mnet_host2service

*Information about the services for a given host*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `hostid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `serviceid` | bigint(10) | NO | `0` |  |  |
| 4 | `publish` | tinyint(1) | NO | `0` |  |  |
| 5 | `subscribe` | tinyint(1) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index** (unique): `hostid`, `serviceid`

### mnet_log

*Store session data from users migrating to other sites*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `hostid` | bigint(10) | NO | `0` | MUL | Unique host ID |
| 3 | `remoteid` | bigint(10) | NO | `0` |  |  |
| 4 | `time` | bigint(10) | NO | `0` |  |  |
| 5 | `userid` | bigint(10) | NO | `0` |  |  |
| 6 | `ip` | varchar(45) | NO | `''` |  |  |
| 7 | `course` | bigint(10) | NO | `0` |  |  |
| 8 | `coursename` | varchar(40) | NO | `''` |  |  |
| 9 | `module` | varchar(20) | NO | `''` |  |  |
| 10 | `cmid` | bigint(10) | NO | `0` |  |  |
| 11 | `action` | varchar(40) | NO | `''` |  |  |
| 12 | `url` | varchar(100) | NO | `''` |  |  |
| 13 | `info` | varchar(255) | NO | `''` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `hostid`, `userid`, `course`

### mnet_remote_rpc

*This table describes functions that might be called remotely (we have less information about them than local functions)*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `functionname` | varchar(40) | NO | `''` |  |  |
| 3 | `xmlrpcpath` | varchar(80) | NO | `''` |  |  |
| 4 | `plugintype` | varchar(20) | NO | `''` |  |  |
| 5 | `pluginname` | varchar(20) | NO | `''` |  |  |
| 6 | `enabled` | tinyint(1) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`

### mnet_remote_service2rpc

*Group functions or methods under a service*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | Required ID field (auto-increment) |
| 2 | `serviceid` | bigint(10) | NO | `0` |  | Unique service ID |
| 3 | `rpcid` | bigint(10) | NO | `0` | MUL | Unique Function ID |

**Keys & indexes**

- **Primary key:** `id`
- **Index** (unique): `rpcid`, `serviceid`

### mnet_rpc

*Functions or methods that we may publish or subscribe to*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | Unique Function ID (auto-increment) |
| 2 | `functionname` | varchar(40) | NO | `''` |  |  |
| 3 | `xmlrpcpath` | varchar(80) | NO | `''` |  |  |
| 4 | `plugintype` | varchar(20) | NO | `''` |  |  |
| 5 | `pluginname` | varchar(20) | NO | `''` |  |  |
| 6 | `enabled` | tinyint(1) | NO | `0` | MUL |  |
| 7 | `help` | longtext | NO |  |  |  |
| 8 | `profile` | longtext | NO |  |  | Method signature |
| 9 | `filename` | varchar(100) | NO | `''` |  |  |
| 10 | `classname` | varchar(150) | YES | `NULL` |  |  |
| 11 | `static` | tinyint(1) | YES | `NULL` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `enabled`, `xmlrpcpath`

### mnet_service

*A service is a group of functions*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | Unique Service ID (auto-increment) |
| 2 | `name` | varchar(40) | NO | `''` |  |  |
| 3 | `description` | varchar(40) | NO | `''` |  |  |
| 4 | `apiversion` | varchar(10) | NO | `''` |  |  |
| 5 | `offer` | tinyint(1) | NO | `0` |  | Do we even offer this service? |

**Keys & indexes**

- **Primary key:** `id`

### mnet_service2rpc

*Group functions or methods under a service*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | Required ID field (auto-increment) |
| 2 | `serviceid` | bigint(10) | NO | `0` |  | Unique service ID |
| 3 | `rpcid` | bigint(10) | NO | `0` | MUL | Unique Function ID |

**Keys & indexes**

- **Primary key:** `id`
- **Index** (unique): `rpcid`, `serviceid`

### mnet_session

*Store session data from users migrating to other sites*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | Required ID field (auto-increment) |
| 2 | `userid` | bigint(10) | NO | `0` | MUL | Unique user ID |
| 3 | `username` | varchar(100) | NO | `''` |  | Unique username |
| 4 | `token` | varchar(40) | NO | `''` | UNI | Unique SHA1 Token |
| 5 | `mnethostid` | bigint(10) | NO | `0` | MUL | Unique remote host ID |
| 6 | `useragent` | varchar(40) | NO | `''` |  | SHA1 hash of User Agent |
| 7 | `confirm_timeout` | bigint(10) | NO | `0` |  | UNIX timestamp for expiry of session |
| 8 | `session_id` | varchar(40) | NO | `''` |  | The PHP Session ID |
| 9 | `expires` | bigint(10) | NO | `0` |  | Expire time of session on peer |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)
- **FK** `mnethostid` → `mnet_host`(`id`)
- **Index** (unique): `token`

### mnet_sso_access_control

*Users by host permitted (or not) to login from a remote provider*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | Required ID field (auto-increment) |
| 2 | `username` | varchar(100) | NO | `''` |  | Username |
| 3 | `mnet_host_id` | bigint(10) | NO | `0` | MUL | id of mnet host |
| 4 | `accessctrl` | varchar(20) | NO | `'allow'` |  | Whether or not this user/host can login |

**Keys & indexes**

- **Primary key:** `id`
- **Index** (unique): `mnet_host_id`, `username`

### modules

*modules available in the site*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `name` | varchar(20) | NO | `''` | MUL |  |
| 3 | `cron` | bigint(10) | NO | `0` |  |  |
| 4 | `lastcron` | bigint(10) | NO | `0` |  |  |
| 5 | `search` | varchar(255) | NO | `''` |  |  |
| 6 | `visible` | tinyint(1) | NO | `1` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `name`

### my_pages

*Extra user pages for the My Moodle system*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | YES | `0` | MUL | The user who owns this page or 0 for system defaults |
| 3 | `name` | varchar(200) | NO | `''` |  | The page name (freeform text) |
| 4 | `private` | tinyint(1) | NO | `1` |  | Whether or not the page is private (dashboard) or public (profile) |
| 5 | `sortorder` | mediumint(6) | NO | `0` |  | The order of the pages for a user |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `userid`, `private`

### notifications

*Stores all notifications*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `useridfrom` | bigint(10) | NO |  | MUL |  |
| 3 | `useridto` | bigint(10) | NO |  | MUL |  |
| 4 | `subject` | longtext | YES | `NULL` |  | The message subject |
| 5 | `fullmessage` | longtext | YES | `NULL` |  |  |
| 6 | `fullmessageformat` | tinyint(1) | NO | `0` |  |  |
| 7 | `fullmessagehtml` | longtext | YES | `NULL` |  |  |
| 8 | `smallmessage` | longtext | YES | `NULL` |  |  |
| 9 | `component` | varchar(100) | YES | `NULL` |  |  |
| 10 | `eventtype` | varchar(100) | YES | `NULL` |  |  |
| 11 | `contexturl` | longtext | YES | `NULL` |  |  |
| 12 | `contexturlname` | longtext | YES | `NULL` |  |  |
| 13 | `timeread` | bigint(10) | YES | `NULL` | MUL |  |
| 14 | `timecreated` | bigint(10) | NO |  | MUL |  |
| 15 | `customdata` | longtext | YES | `NULL` |  | Custom data to be passed to the message processor. Must be serialisable using json_encode() |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `useridto` → `user`(`id`)
- **Index**: `useridfrom`
- **Index**: `timecreated`
- **Index**: `timeread`

### oauth2_access_token

*Stores access tokens for system accounts in order to be able to use a single token across multiple sessions*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `timecreated` | bigint(10) | NO |  |  | Time this record was created. |
| 3 | `timemodified` | bigint(10) | NO |  |  | Time this record was modified. |
| 4 | `usermodified` | bigint(10) | NO |  | MUL | The user who modified this record. |
| 5 | `issuerid` | bigint(10) | NO |  | UNI | Corresponding oauth2 issuer |
| 6 | `token` | longtext | NO |  |  | access token |
| 7 | `expires` | bigint(10) | NO |  |  | Expiry timestamp (according to the issuer) |
| 8 | `scope` | longtext | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `issuerid` → `oauth2_issuer`(`id`) *(unique)*
- **FK** `usermodified` → `user`(`id`)

### oauth2_endpoint

*Describes the named endpoint for an oauth2 service.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `timecreated` | bigint(10) | NO |  |  | The time this record was created. |
| 3 | `timemodified` | bigint(10) | NO |  |  | The time this record was modified. |
| 4 | `usermodified` | bigint(10) | NO |  | MUL | The user who modified this record. |
| 5 | `name` | varchar(255) | NO | `''` |  | The service name. |
| 6 | `url` | longtext | NO |  |  | The url to the endpoint |
| 7 | `issuerid` | bigint(10) | NO |  | MUL | The identity provider this service belongs to. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `issuerid` → `oauth2_issuer`(`id`)
- **FK** `usermodified` → `user`(`id`)

### oauth2_issuer

*Details for an oauth 2 connect identity issuer.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `timecreated` | bigint(10) | NO |  |  | Time this record was created. |
| 3 | `timemodified` | bigint(10) | NO |  |  | Time this record was modified. |
| 4 | `usermodified` | bigint(10) | NO |  |  | The user who modified this record |
| 5 | `name` | varchar(255) | NO | `''` |  | The name of this identity issuer |
| 6 | `image` | longtext | NO |  |  |  |
| 7 | `baseurl` | longtext | NO |  |  | The base url to the issuer |
| 8 | `clientid` | longtext | NO |  |  | The client id used to connect to this oauth2 service. |
| 9 | `clientsecret` | longtext | NO |  |  | The secret used to connect to this oauth2 service. |
| 10 | `loginscopes` | longtext | NO |  |  | The scopes requested for a normal login attempt. |
| 11 | `loginscopesoffline` | longtext | NO |  |  | The scopes requested for a login attempt to generate a refresh token. |
| 12 | `loginparams` | longtext | NO |  |  | Additional parameters sent for a login attempt. |
| 13 | `loginparamsoffline` | longtext | NO |  |  | Additional parameters sent for a login attempt to generate a refresh token. |
| 14 | `alloweddomains` | longtext | NO |  |  | Allowed domains for this issuer. |
| 15 | `scopessupported` | longtext | YES | `NULL` |  | The list of scopes this service supports. |
| 16 | `enabled` | tinyint(2) | NO | `1` |  |  |
| 17 | `showonloginpage` | tinyint(2) | NO | `1` |  |  |
| 18 | `basicauth` | tinyint(2) | NO | `0` |  | Use HTTP Basic authentication scheme when sending client ID and password |
| 19 | `sortorder` | bigint(10) | NO |  |  | The defined sort order. |
| 20 | `requireconfirmation` | tinyint(2) | NO | `1` |  |  |
| 21 | `servicetype` | varchar(255) | YES | `NULL` |  | Issuer service type, such as 'google' or 'facebook'. |
| 22 | `loginpagename` | varchar(255) | YES | `NULL` |  |  |
| 23 | `systememail` | varchar(100) | YES | `NULL` |  | The email that will be used connect system account for sending email via SMTP |

**Keys & indexes**

- **Primary key:** `id`

### oauth2_refresh_token

*Stores refresh tokens which can be exchanged for access tokens*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `timecreated` | bigint(10) | NO |  |  | Time this record was created. |
| 3 | `timemodified` | bigint(10) | NO |  |  | Time this record was modified. |
| 4 | `userid` | bigint(10) | NO |  | MUL | The user to whom this refresh token belongs. |
| 5 | `issuerid` | bigint(10) | NO |  | MUL | Corresponding oauth2 issuer |
| 6 | `token` | longtext | NO |  |  | refresh token |
| 7 | `scopehash` | varchar(40) | NO | `''` |  | sha1 hash of the scopes used when requesting the refresh token |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `issuerid` → `oauth2_issuer`(`id`)
- **FK** `userid` → `user`(`id`)
- **Index** (unique): `userid`, `issuerid`, `scopehash`

### oauth2_system_account

*Stored details used to get an access token as a system user for this oauth2 service.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `timecreated` | bigint(10) | NO |  |  | Time this record was created. |
| 3 | `timemodified` | bigint(10) | NO |  |  | Time this record was modified. |
| 4 | `usermodified` | bigint(10) | NO |  | MUL | The user who modified this record. |
| 5 | `issuerid` | bigint(10) | NO |  | UNI | The id of the oauth 2 identity issuer |
| 6 | `refreshtoken` | longtext | NO |  |  | The refresh token used to request access tokens. |
| 7 | `grantedscopes` | longtext | NO |  |  | The scopes that this system account has been granted access to. |
| 8 | `email` | longtext | YES | `NULL` |  | The email that was connected to this issuer. |
| 9 | `username` | longtext | NO |  |  | The username that was connected as a system account to this issue. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `issuerid` → `oauth2_issuer`(`id`) *(unique)*
- **FK** `usermodified` → `user`(`id`)

### oauth2_user_field_mapping

*Mapping of oauth user fields to moodle fields.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `timemodified` | bigint(10) | NO |  |  | The time this record was modified |
| 3 | `timecreated` | bigint(10) | NO |  |  | The time this record was created. |
| 4 | `usermodified` | bigint(10) | NO |  | MUL | The user who modified this record. |
| 5 | `issuerid` | bigint(10) | NO |  | MUL | The oauth issuer. |
| 6 | `externalfield` | varchar(500) | NO | `''` |  | The fieldname returned by the userinfo endpoint. |
| 7 | `internalfield` | varchar(64) | NO | `''` |  | The name of the Moodle field this user field maps to. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `issuerid` → `oauth2_issuer`(`id`)
- **FK** `usermodified` → `user`(`id`)
- **Unique:** `issuerid`, `internalfield`

### page

*Each record is one page and its config data*

<sub>defined in `public/mod/page/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `course` | bigint(10) | NO | `0` | MUL |  |
| 3 | `name` | varchar(1333) | NO | `''` |  |  |
| 4 | `intro` | longtext | YES | `NULL` |  |  |
| 5 | `introformat` | smallint(4) | NO | `0` |  |  |
| 6 | `content` | longtext | YES | `NULL` |  |  |
| 7 | `contentformat` | smallint(4) | NO | `0` |  |  |
| 8 | `legacyfiles` | smallint(4) | NO | `0` |  |  |
| 9 | `legacyfileslast` | bigint(10) | YES | `NULL` |  |  |
| 10 | `display` | smallint(4) | NO | `0` |  |  |
| 11 | `displayoptions` | longtext | YES | `NULL` |  |  |
| 12 | `revision` | bigint(10) | NO | `0` |  | incremented when after each file changes, solves browser caching issues |
| 13 | `timemodified` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `course`

### paygw_paypal

*Stores PayPal related information*

<sub>defined in `public/payment/gateway/paypal/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `paymentid` | bigint(10) | NO |  | UNI |  |
| 3 | `pp_orderid` | varchar(255) | NO | `'The ID of the order in PayPal'` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `paymentid` → `payments`(`id`) *(unique)*

### payment_accounts

*Payment accounts*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `name` | varchar(255) | NO | `''` |  |  |
| 3 | `idnumber` | varchar(100) | YES | `NULL` |  |  |
| 4 | `contextid` | bigint(10) | NO |  | MUL |  |
| 5 | `enabled` | tinyint(1) | NO | `0` |  |  |
| 6 | `archived` | tinyint(1) | NO | `0` |  |  |
| 7 | `timecreated` | bigint(10) | YES | `NULL` |  |  |
| 8 | `timemodified` | bigint(10) | YES | `NULL` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `contextid` → `context`(`id`)

### payment_gateways

*Configuration for one gateway for one payment account*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `accountid` | bigint(10) | NO |  | MUL |  |
| 3 | `gateway` | varchar(100) | NO | `''` |  |  |
| 4 | `enabled` | tinyint(1) | NO | `1` |  |  |
| 5 | `config` | longtext | YES | `NULL` |  |  |
| 6 | `timecreated` | bigint(10) | NO |  |  |  |
| 7 | `timemodified` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `accountid` → `payment_accounts`(`id`)

### payments

*Stores information about payments*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `component` | varchar(100) | NO | `''` | MUL | The plugin this payment belongs to. |
| 3 | `paymentarea` | varchar(50) | NO | `''` |  | The name of payable area |
| 4 | `itemid` | bigint(10) | NO |  |  |  |
| 5 | `userid` | bigint(10) | NO |  | MUL |  |
| 6 | `amount` | varchar(20) | NO | `''` |  |  |
| 7 | `currency` | varchar(3) | NO | `''` |  |  |
| 8 | `accountid` | bigint(10) | NO |  | MUL |  |
| 9 | `gateway` | varchar(100) | NO | `''` | MUL |  |
| 10 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 11 | `timemodified` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)
- **FK** `accountid` → `payment_accounts`(`id`)
- **Index**: `gateway`
- **Index**: `component`, `paymentarea`, `itemid`

### portfolio_instance

*base table (not including config data) for instances of portfolio plugins.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `plugin` | varchar(50) | NO | `''` |  | fk to plugin |
| 3 | `name` | varchar(255) | NO | `''` |  | name of plugin instance |
| 4 | `visible` | tinyint(1) | NO | `1` |  | whether this instance is visible or not |

**Keys & indexes**

- **Primary key:** `id`

### portfolio_instance_config

*config for portfolio plugin instances*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `instance` | bigint(10) | NO |  | MUL | instance of plugin we're configurating |
| 3 | `name` | varchar(255) | NO | `''` | MUL | config field |
| 4 | `value` | longtext | YES | `NULL` |  | config value |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `instance` → `portfolio_instance`(`id`)
- **Index**: `name`

### portfolio_instance_user

*user data for portfolio instances.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `instance` | bigint(10) | NO |  | MUL | fk to instance table |
| 3 | `userid` | bigint(10) | NO |  | MUL | fk to user table |
| 4 | `name` | varchar(255) | NO | `''` |  | name of config item |
| 5 | `value` | longtext | YES | `NULL` |  | value of config item |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `instance` → `portfolio_instance`(`id`)
- **FK** `userid` → `user`(`id`)

### portfolio_log

*log of portfolio transfers (used to later check for duplicates)*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO |  | MUL | user who exported content |
| 3 | `time` | bigint(10) | NO |  |  | time of transfer (in the case of a queued transfer this is the time the actual transfer ran, not when the user started) |
| 4 | `portfolio` | bigint(10) | NO |  | MUL | fk to portfolio_instance |
| 5 | `caller_class` | varchar(150) | NO | `''` |  | the name of the class used to create the transfer |
| 6 | `caller_file` | varchar(255) | NO | `''` |  | path to file to include where the class definition lives. (relative to dirroot) |
| 7 | `caller_component` | varchar(255) | YES | `NULL` |  | the component name responsible for exporting |
| 8 | `caller_sha1` | varchar(255) | NO | `''` |  | sha1 of exported content as far as the caller is concerned (before the portfolio plugin gets a hold of it) |
| 9 | `tempdataid` | bigint(10) | NO | `0` | MUL | old id from portfolio_tempdata.  This is so that we can gracefully catch a race condition between an external system requesting a file and causing the tempdata to be deleted, before the user gets the "your transfer is requested" page |
| 10 | `returnurl` | varchar(255) | NO | `''` |  | the original "returnurl" of the export - takes us to the moodle page we started from |
| 11 | `continueurl` | varchar(255) | NO | `''` |  | the url the external system has set to view the transfer |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)
- **FK** `portfolio` → `portfolio_instance`(`id`)
- **FK** `tempdataid` → `portfolio_tempdata`(`id`)

### portfolio_tempdata

*stores temporary data for portfolio exports. the id of this table is used for the itemid for the temporary files area.  cron can clean up stale records (and associated file data) after expirytime.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `data` | longtext | YES | `NULL` |  | dumping ground for portfolio callers to store their data in. |
| 3 | `expirytime` | bigint(10) | NO |  |  | time this record will expire (used for cron cleanups) - the start of export + 24 hours |
| 4 | `userid` | bigint(10) | NO |  | MUL | psuedo fk to user.  this is stored in the serialised data structure in the data field, but added here for ease of lookups. |
| 5 | `instance` | bigint(10) | YES | `0` | MUL | which portfolio plugin instance is being used |
| 6 | `queued` | tinyint(1) | NO | `0` |  | Value 1 means the entry should be processed in cron. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)
- **FK** `instance` → `portfolio_instance`(`id`)

### post

*Generic post table to hold data blog entries etc in different modules*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `module` | varchar(20) | NO | `''` | MUL |  |
| 3 | `userid` | bigint(10) | NO | `0` |  |  |
| 4 | `courseid` | bigint(10) | NO | `0` | MUL |  |
| 5 | `groupid` | bigint(10) | NO | `0` |  |  |
| 6 | `moduleid` | bigint(10) | NO | `0` |  |  |
| 7 | `coursemoduleid` | bigint(10) | NO | `0` | MUL |  |
| 8 | `subject` | varchar(128) | NO | `''` | MUL |  |
| 9 | `summary` | longtext | YES | `NULL` |  |  |
| 10 | `content` | longtext | YES | `NULL` |  |  |
| 11 | `uniquehash` | varchar(255) | NO | `''` |  |  |
| 12 | `rating` | bigint(10) | NO | `0` |  |  |
| 13 | `format` | bigint(10) | NO | `0` |  |  |
| 14 | `summaryformat` | tinyint(2) | NO | `0` |  |  |
| 15 | `attachment` | varchar(100) | YES | `NULL` |  | attachment |
| 16 | `publishstate` | varchar(20) | NO | `'draft'` |  |  |
| 17 | `lastmodified` | bigint(10) | NO | `0` | MUL |  |
| 18 | `created` | bigint(10) | NO | `0` |  |  |
| 19 | `usermodified` | bigint(10) | YES | `NULL` | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `usermodified` → `user`(`id`)
- **FK** `courseid` → `course`(`id`)
- **FK** `coursemoduleid` → `course_modules`(`id`)
- **Index** (unique): `id`, `userid`
- **Index**: `lastmodified`
- **Index**: `module`
- **Index**: `subject`

### profiling

*Stores the results of all the profiling runs*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `runid` | varchar(32) | NO | `''` | UNI | the unique id for this run (as generated by xhprof) |
| 3 | `url` | varchar(255) | NO | `''` | MUL | the url this profiling record is about (without wwwroot nor query params) |
| 4 | `data` | longtext | NO |  |  | the raw data gathered by xhprof |
| 5 | `totalexecutiontime` | bigint(10) | NO |  |  | time (in microseconds) spent by the run |
| 6 | `totalcputime` | bigint(10) | NO |  |  | time (in microseconds) spent by the CPU in this run |
| 7 | `totalcalls` | bigint(10) | NO |  |  | Total number of calls performed by the run |
| 8 | `totalmemory` | bigint(10) | NO |  |  | Total memory used byt the run |
| 9 | `runreference` | tinyint(2) | NO | `0` |  | Is this run a reference one |
| 10 | `runcomment` | varchar(255) | NO | `''` |  | Brief comment for this run |
| 11 | `timecreated` | bigint(10) | NO |  | MUL | unix timestap of the creation of this run |

**Keys & indexes**

- **Primary key:** `id`
- **Unique:** `runid`
- **Index**: `url`, `runreference`
- **Index**: `timecreated`, `runreference`

### qbank

*Stores the qbank activity module instances.*

<sub>defined in `public/mod/qbank/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `course` | bigint(10) | NO |  | MUL | ID of the course this activity is part of. |
| 3 | `name` | varchar(1333) | NO | `''` |  | The name of the activity module instance |
| 4 | `timecreated` | bigint(10) | NO | `0` |  | Timestamp of when the instance was added to the course. |
| 5 | `timemodified` | bigint(10) | NO | `0` |  | Timestamp of when the instance was last modified. |
| 6 | `intro` | longtext | YES | `NULL` |  | Activity description. |
| 7 | `introformat` | smallint(4) | NO | `0` |  | The format of the intro field. |
| 8 | `type` | varchar(40) | NO | `''` |  | The sub type of the activity module instance, e.g. standard, system, etc |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `course` → `course`(`id`)

### qtype_ddimageortext

*Defines drag and drop (text or images onto a background image) questions*

<sub>defined in `public/question/type/ddimageortext/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `questionid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `shuffleanswers` | smallint(4) | NO | `1` |  |  |
| 4 | `correctfeedback` | longtext | NO |  |  | Feedback shown for any correct response. |
| 5 | `correctfeedbackformat` | tinyint(2) | NO | `0` |  |  |
| 6 | `partiallycorrectfeedback` | longtext | NO |  |  | Feedback shown for any partially correct response. |
| 7 | `partiallycorrectfeedbackformat` | tinyint(2) | NO | `0` |  |  |
| 8 | `incorrectfeedback` | longtext | NO |  |  | Feedback shown for any incorrect response. |
| 9 | `incorrectfeedbackformat` | tinyint(2) | NO | `0` |  |  |
| 10 | `shownumcorrect` | tinyint(2) | NO | `0` |  |  |
| 11 | `dropzonevisibility` | tinyint(2) | NO | `0` |  | Whether transparent dropzone or not. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `questionid` → `question`(`id`)

### qtype_ddimageortext_drags

*Images to drag. Actual file names are not stored here we use the file names as found in the file storage area.*

<sub>defined in `public/question/type/ddimageortext/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `questionid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `no` | bigint(10) | NO | `0` |  | drag no |
| 4 | `draggroup` | bigint(10) | NO | `0` |  |  |
| 5 | `infinite` | smallint(4) | NO | `0` |  |  |
| 6 | `label` | longtext | NO |  |  | Alt text label for drag-able image. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `questionid` → `question`(`id`)

### qtype_ddimageortext_drops

*Drop boxes*

<sub>defined in `public/question/type/ddimageortext/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `questionid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `no` | bigint(10) | NO | `0` |  | drop number |
| 4 | `xleft` | bigint(10) | NO | `0` |  |  |
| 5 | `ytop` | bigint(10) | NO | `0` |  |  |
| 6 | `choice` | bigint(10) | NO | `0` |  |  |
| 7 | `label` | longtext | NO |  |  | Alt label for drop box |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `questionid` → `question`(`id`)

### qtype_ddmarker

*Defines drag and drop (text or images onto a background image) questions*

<sub>defined in `public/question/type/ddmarker/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `questionid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `shuffleanswers` | smallint(4) | NO | `1` |  |  |
| 4 | `correctfeedback` | longtext | NO |  |  | Feedback shown for any correct response. |
| 5 | `correctfeedbackformat` | tinyint(2) | NO | `0` |  |  |
| 6 | `partiallycorrectfeedback` | longtext | NO |  |  | Feedback shown for any partially correct response. |
| 7 | `partiallycorrectfeedbackformat` | tinyint(2) | NO | `0` |  |  |
| 8 | `incorrectfeedback` | longtext | NO |  |  | Feedback shown for any incorrect response. |
| 9 | `incorrectfeedbackformat` | tinyint(2) | NO | `0` |  |  |
| 10 | `shownumcorrect` | tinyint(2) | NO | `0` |  |  |
| 11 | `showmisplaced` | smallint(4) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `questionid` → `question`(`id`)

### qtype_ddmarker_drags

*Labels for markers to drag.*

<sub>defined in `public/question/type/ddmarker/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `questionid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `no` | bigint(10) | NO | `0` |  | drag no |
| 4 | `label` | longtext | NO |  |  | Alt text label for drag-able image. |
| 5 | `infinite` | smallint(4) | NO | `0` |  |  |
| 6 | `noofdrags` | bigint(10) | NO | `1` |  | No of drag items, ignored if drag is infinite. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `questionid` → `question`(`id`)

### qtype_ddmarker_drops

*drop regions*

<sub>defined in `public/question/type/ddmarker/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `questionid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `no` | bigint(10) | NO | `0` |  | drop number |
| 4 | `shape` | varchar(255) | YES | `NULL` |  | circle, rectangle, polygon |
| 5 | `coords` | longtext | NO |  |  |  |
| 6 | `choice` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `questionid` → `question`(`id`)

### qtype_essay_options

*Extra options for essay questions.*

<sub>defined in `public/question/type/essay/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `questionid` | bigint(10) | NO |  | UNI | Foreign key linking to the question table. |
| 3 | `responseformat` | varchar(16) | NO | `'editor'` |  | The type of input area students should be given for their response. |
| 4 | `responserequired` | tinyint(2) | NO | `1` |  | Nonzero if an online text response is optional |
| 5 | `responsefieldlines` | smallint(4) | NO | `15` |  | Approximate height, in lines, of the input box the students should be given for their response. |
| 6 | `minwordlimit` | bigint(10) | YES | `NULL` |  | Minimum number of words |
| 7 | `maxwordlimit` | bigint(10) | YES | `NULL` |  | Maximum number of words |
| 8 | `attachments` | smallint(4) | NO | `0` |  | Whether, and how many, attachments a student is allowed to include with their response. -1 means unlimited. |
| 9 | `attachmentsrequired` | smallint(4) | NO | `0` |  | The number of attachments that should be required |
| 10 | `graderinfo` | longtext | YES | `NULL` |  | Information shown to people with permission to manually grade the question, when they are grading. |
| 11 | `graderinfoformat` | smallint(4) | NO | `0` |  | The text format for graderinfo. |
| 12 | `responsetemplate` | longtext | YES | `NULL` |  | The template to pre-populate student's response field during attempt. |
| 13 | `responsetemplateformat` | smallint(4) | NO | `0` |  | The text format for responsetemplate. |
| 14 | `maxbytes` | bigint(10) | NO | `0` |  | Maximum size of attached files in bytes. |
| 15 | `filetypeslist` | longtext | YES | `NULL` |  | What attachment file type a student is allowed to include with their response. * or empty means unlimited. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `questionid` → `question`(`id`) *(unique)*

### qtype_match_options

*Defines the question-type specific options for matching questions*

<sub>defined in `public/question/type/match/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `questionid` | bigint(10) | NO | `0` | UNI | Foreign key link to question.id. |
| 3 | `shuffleanswers` | smallint(4) | NO | `1` |  |  |
| 4 | `correctfeedback` | longtext | NO |  |  | Feedback shown for any correct response. |
| 5 | `correctfeedbackformat` | tinyint(2) | NO | `0` |  |  |
| 6 | `partiallycorrectfeedback` | longtext | NO |  |  | Feedback shown for any partially correct response. |
| 7 | `partiallycorrectfeedbackformat` | tinyint(2) | NO | `0` |  |  |
| 8 | `incorrectfeedback` | longtext | NO |  |  | Feedback shown for any incorrect response. |
| 9 | `incorrectfeedbackformat` | tinyint(2) | NO | `0` |  |  |
| 10 | `shownumcorrect` | tinyint(2) | NO | `0` |  | If true, then when the user gets the question partially correct, tell them how many choices they got correct alongside the feedback. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `questionid` → `question`(`id`) *(unique)*

### qtype_match_subquestions

*The subquestions that make up a matching question*

<sub>defined in `public/question/type/match/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `questionid` | bigint(10) | NO | `0` | MUL | Foreign key link to question.id. |
| 3 | `questiontext` | longtext | NO |  |  |  |
| 4 | `questiontextformat` | tinyint(2) | NO | `0` |  |  |
| 5 | `answertext` | varchar(255) | NO | `''` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `questionid` → `question`(`id`)

### qtype_multichoice_options

*Options for multiple choice questions*

<sub>defined in `public/question/type/multichoice/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `questionid` | bigint(10) | NO | `0` | UNI | Foreign key references question.id |
| 3 | `layout` | smallint(4) | NO | `0` |  | Not used. Was intended for a vertical/horizontal layout option. See MDL-18445. |
| 4 | `single` | smallint(4) | NO | `0` |  | If 0 it multiple response (checkboxes). Otherwise it is radio buttons. |
| 5 | `shuffleanswers` | smallint(4) | NO | `1` |  | Whether the choices can be randomly shuffled. |
| 6 | `correctfeedback` | longtext | NO |  |  | Feedback shown for any correct response. |
| 7 | `correctfeedbackformat` | tinyint(2) | NO | `0` |  |  |
| 8 | `partiallycorrectfeedback` | longtext | NO |  |  | Feedback shown for any partially correct response. |
| 9 | `partiallycorrectfeedbackformat` | tinyint(2) | NO | `0` |  |  |
| 10 | `incorrectfeedback` | longtext | NO |  |  | Feedback shown for any incorrect response. |
| 11 | `incorrectfeedbackformat` | tinyint(2) | NO | `0` |  |  |
| 12 | `answernumbering` | varchar(10) | NO | `'abc'` |  | Indicates how and whether the choices should be numbered. |
| 13 | `shownumcorrect` | tinyint(2) | NO | `0` |  | If true, then when the user gets a multiple-response question partially correct, tell them how many choices they got correct alongside the feedback. |
| 14 | `showstandardinstruction` | tinyint(2) | NO | `1` |  | Whether standard instruction ('Select one:' or 'Select one or more:') is displayed |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `questionid` → `question`(`id`) *(unique)*

### qtype_ordering_options

*Options for ordering questions*

<sub>defined in `public/question/type/ordering/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `questionid` | bigint(10) | NO | `0` | UNI |  |
| 3 | `layouttype` | tinyint(2) | NO | `0` |  | Layout type - horizontal or vertical |
| 4 | `selecttype` | tinyint(2) | NO | `0` |  | Select type - all, random etc. |
| 5 | `selectcount` | smallint(4) | NO | `2` |  | The number to select. |
| 6 | `gradingtype` | tinyint(2) | NO | `0` |  | Which grading strategy to use. One of the GRADING_... constants. |
| 7 | `showgrading` | tinyint(2) | NO | `0` |  | Should details of the grading calculation be shown to students. |
| 8 | `numberingstyle` | varchar(10) | NO | `'none'` |  | Indicates whether and how choices should be numbered. |
| 9 | `correctfeedback` | longtext | YES | `NULL` |  |  |
| 10 | `correctfeedbackformat` | tinyint(2) | NO | `0` |  |  |
| 11 | `incorrectfeedback` | longtext | YES | `NULL` |  |  |
| 12 | `incorrectfeedbackformat` | tinyint(2) | NO | `0` |  |  |
| 13 | `partiallycorrectfeedback` | longtext | YES | `NULL` |  |  |
| 14 | `partiallycorrectfeedbackformat` | tinyint(2) | NO | `0` |  |  |
| 15 | `shownumcorrect` | tinyint(2) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `questionid` → `question`(`id`) *(unique)*

### qtype_randomsamatch_options

*Info about a random short-answer matching question*

<sub>defined in `public/question/type/randomsamatch/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `questionid` | bigint(10) | NO | `0` | UNI | Foreign key references question.id. |
| 3 | `choose` | bigint(10) | NO | `4` |  | Number of subquestions to randomly generate. |
| 4 | `subcats` | tinyint(2) | NO | `1` |  | Whether to include or not the subcategories. |
| 5 | `correctfeedback` | longtext | NO |  |  | Feedback shown for any correct response. |
| 6 | `correctfeedbackformat` | tinyint(2) | NO | `0` |  |  |
| 7 | `partiallycorrectfeedback` | longtext | NO |  |  | Feedback shown for any partially correct response. |
| 8 | `partiallycorrectfeedbackformat` | tinyint(2) | NO | `0` |  |  |
| 9 | `incorrectfeedback` | longtext | NO |  |  | Feedback shown for any incorrect response. |
| 10 | `incorrectfeedbackformat` | tinyint(2) | NO | `0` |  |  |
| 11 | `shownumcorrect` | tinyint(2) | NO | `0` |  | If true, then when the user gets the question partially correct, tell them how many choices they got correct alongside the feedback. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `questionid` → `question`(`id`) *(unique)*

### qtype_shortanswer_options

*Options for short answer questions*

<sub>defined in `public/question/type/shortanswer/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `questionid` | bigint(10) | NO | `0` | UNI | Foreign key references question.id. |
| 3 | `usecase` | tinyint(2) | NO | `0` |  | Whether answers are matched case-sensitively. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `questionid` → `question`(`id`) *(unique)*

### question

*This table stores the definition of one version of a question.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `parent` | bigint(10) | NO | `0` | MUL |  |
| 3 | `name` | varchar(255) | NO | `''` |  |  |
| 4 | `questiontext` | longtext | NO |  |  |  |
| 5 | `questiontextformat` | tinyint(2) | NO | `0` |  |  |
| 6 | `generalfeedback` | longtext | NO |  |  | to store the question feedback |
| 7 | `generalfeedbackformat` | tinyint(2) | NO | `0` |  |  |
| 8 | `defaultmark` | decimal(12,7) | NO | `1.0000000` |  |  |
| 9 | `penalty` | decimal(12,7) | NO | `0.3333333` |  |  |
| 10 | `qtype` | varchar(20) | NO | `''` | MUL |  |
| 11 | `length` | bigint(10) | NO | `1` |  |  |
| 12 | `stamp` | varchar(255) | NO | `''` |  |  |
| 13 | `timecreated` | bigint(10) | NO | `0` |  | time question was created |
| 14 | `timemodified` | bigint(10) | NO | `0` |  | time that question was last modified |
| 15 | `createdby` | bigint(10) | YES | `NULL` | MUL | userid of person who created this question |
| 16 | `modifiedby` | bigint(10) | YES | `NULL` | MUL | userid of person who last edited this question |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `parent` → `question`(`id`)
- **FK** `createdby` → `user`(`id`)
- **FK** `modifiedby` → `user`(`id`)
- **Index**: `qtype`

### question_answers

*Answers, with a fractional grade (0-1) and feedback*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `question` | bigint(10) | NO | `0` | MUL |  |
| 3 | `answer` | longtext | NO |  |  |  |
| 4 | `answerformat` | tinyint(2) | NO | `0` |  |  |
| 5 | `fraction` | decimal(12,7) | NO | `0.0000000` |  |  |
| 6 | `feedback` | longtext | NO |  |  |  |
| 7 | `feedbackformat` | tinyint(2) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `question` → `question`(`id`)

### question_attempt_step_data

*Each question_attempt_step has an associative array of the data that was submitted by the user in the POST request. It can also contain extra data from the question type or behaviour to avoid re-computation. The convention is that names belonging to the behaviour start with -, and cached values added to the submitted data start with _, or _-*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `attemptstepid` | bigint(10) | NO |  | MUL | Foreign key, references question_attempt_steps.id |
| 3 | `name` | varchar(32) | NO | `''` |  | The name of this bit of data. |
| 4 | `value` | longtext | YES | `NULL` |  | The corresponding value |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `attemptstepid` → `question_attempt_steps`(`id`)

### question_attempt_steps

*Stores one step in in a question attempt. As well as the data here, the step will have some data in the question_attempt_step_data table.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `questionattemptid` | bigint(10) | NO |  | MUL | Foreign key, references question_attempt.id |
| 3 | `sequencenumber` | bigint(10) | NO |  |  | Numbers the steps in a question attempt sequentially from 0. |
| 4 | `state` | varchar(13) | NO | `''` |  | One of the constants defined by the question_state class, giving the state of the question at the end of this step. |
| 5 | `fraction` | decimal(12,7) | YES | `NULL` |  | The grade for this question, when graded out of 1. Needs to be multiplied by question_attempt.maxmark to get the actual mark for the question. |
| 6 | `timecreated` | bigint(10) | NO |  |  | Time-stamp of the action that lead to this state being created. If this is -1 (quiz_attempt_step::TIMECREATED_ON_FIRST_RENDER), it will be set the first time the question attempt is rendered. |
| 7 | `userid` | bigint(10) | YES | `NULL` | MUL | The user whose action lead to this state being created. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `questionattemptid` → `question_attempts`(`id`)
- **FK** `userid` → `user`(`id`)
- **Index** (unique): `questionattemptid`, `sequencenumber`

### question_attempts

*Each row here corresponds to an attempt at one question, as part of a question_usage. A question_attempt will have some question_attempt_steps*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `questionusageid` | bigint(10) | NO |  | MUL | Foreign key, references question_usages.id |
| 3 | `slot` | bigint(10) | NO |  |  | Used to number the questions in one attempt sequentially. |
| 4 | `behaviour` | varchar(32) | NO | `''` | MUL | The name of the question behaviour that is managing this question attempt. |
| 5 | `questionid` | bigint(10) | NO |  | MUL | The id of the question being attempted. Foreign key references question.id. |
| 6 | `variant` | bigint(10) | NO | `1` |  | The variant of the qusetion being used. |
| 7 | `maxmark` | decimal(12,7) | NO |  |  | The grade this question is marked out of in this attempt. |
| 8 | `minfraction` | decimal(12,7) | NO |  |  | Some questions can award negative marks. This indicates the most negative mark that can be awarded, on the faction scale where the maximum positive mark is 1. |
| 9 | `maxfraction` | decimal(12,7) | NO | `1.0000000` |  | Some questions can give fractions greater than 1. This indicates the greatest fraction that can be awarded. |
| 10 | `flagged` | tinyint(1) | NO | `0` |  | Whether this question has been flagged within the attempt. |
| 11 | `questionsummary` | longtext | YES | `NULL` |  | If this question uses randomisation, it should set this field to summarise what random version the student actually saw. This is a human-readable textual summary of the student's response which might, for example, be used in a report. |
| 12 | `rightanswer` | longtext | YES | `NULL` |  | This is a human-readable textual summary of the right answer to this question. Might be used, for example on the quiz preview, to help people who are testing the question. Or might be used in reports. |
| 13 | `responsesummary` | longtext | YES | `NULL` |  | This is a textual summary of the student's response (basically what you would expect to in the Quiz responses report). |
| 14 | `timemodified` | bigint(10) | NO |  |  | The time this record was last changed. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `questionid` → `question`(`id`)
- **FK** `questionusageid` → `question_usages`(`id`)
- **Index** (unique): `questionusageid`, `slot`
- **Index**: `behaviour`

### question_bank_entries

*Each question bank entry. This table has one row for each question that appears in the question bank.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `questioncategoryid` | bigint(10) | NO | `0` | MUL | ID of the category this question is part of. |
| 3 | `idnumber` | varchar(100) | YES | `NULL` |  | Unique identifier, useful especially for mapping to external entities. |
| 4 | `ownerid` | bigint(10) | YES | `NULL` | MUL | userid of person who owns this question bank entry. |
| 5 | `nextversion` | bigint(10) | YES | `NULL` |  | The next version number for this question bank entry. This must be incremented each time a new question_version is created. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `questioncategoryid` → `question_categories`(`id`)
- **FK** `ownerid` → `user`(`id`)
- **Index** (unique): `questioncategoryid`, `idnumber`

### question_calculated

*Options for questions of type calculated*

<sub>defined in `public/question/type/calculated/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `question` | bigint(10) | NO | `0` | MUL |  |
| 3 | `answer` | bigint(10) | NO | `0` | MUL |  |
| 4 | `tolerance` | varchar(20) | NO | `'0.0'` |  |  |
| 5 | `tolerancetype` | bigint(10) | NO | `1` |  |  |
| 6 | `correctanswerlength` | bigint(10) | NO | `2` |  |  |
| 7 | `correctanswerformat` | bigint(10) | NO | `2` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `question` → `question`(`id`)
- **Index**: `answer`

### question_calculated_options

*Options for questions of type calculated*

<sub>defined in `public/question/type/calculated/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `question` | bigint(10) | NO | `0` | MUL |  |
| 3 | `synchronize` | tinyint(2) | NO | `0` |  |  |
| 4 | `single` | smallint(4) | NO | `0` |  | If 0 it multiple response (checkboxes). Otherwise it is radio buttons. |
| 5 | `shuffleanswers` | smallint(4) | NO | `0` |  | Whether the choices can be randomly shuffled. |
| 6 | `correctfeedback` | longtext | YES | `NULL` |  | Feedback shown for any correct response. |
| 7 | `correctfeedbackformat` | tinyint(2) | NO | `0` |  |  |
| 8 | `partiallycorrectfeedback` | longtext | YES | `NULL` |  | Feedback shown for any partially correct response. |
| 9 | `partiallycorrectfeedbackformat` | tinyint(2) | NO | `0` |  |  |
| 10 | `incorrectfeedback` | longtext | YES | `NULL` |  | Feedback shown for any incorrect response. |
| 11 | `incorrectfeedbackformat` | tinyint(2) | NO | `0` |  |  |
| 12 | `answernumbering` | varchar(10) | NO | `'abc'` |  | Indicates how and whether the choices should be numbered. |
| 13 | `shownumcorrect` | tinyint(2) | NO | `0` |  | If true, then when the user gets a multiple-response question partially correct, tell them how many choices they got correct alongside the feedback. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `question` → `question`(`id`)

### question_categories

*Categories are for grouping questions*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `name` | varchar(1333) | NO | `''` |  |  |
| 3 | `contextid` | bigint(10) | NO | `0` | MUL | context that this category is shared in |
| 4 | `info` | longtext | NO |  |  |  |
| 5 | `infoformat` | tinyint(2) | NO | `0` |  |  |
| 6 | `stamp` | varchar(255) | NO | `''` |  |  |
| 7 | `parent` | bigint(10) | NO | `0` | MUL |  |
| 8 | `sortorder` | bigint(10) | NO | `999` |  |  |
| 9 | `idnumber` | varchar(100) | YES | `NULL` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `parent` → `question_categories`(`id`)
- **Index**: `contextid`
- **Index** (unique): `contextid`, `stamp`
- **Index** (unique): `contextid`, `idnumber`

### question_dataset_definitions

*Organises and stores properties for dataset items*

<sub>defined in `public/question/type/calculated/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `category` | bigint(10) | NO | `0` | MUL |  |
| 3 | `name` | varchar(255) | NO | `''` |  |  |
| 4 | `type` | bigint(10) | NO | `0` |  |  |
| 5 | `options` | varchar(255) | NO | `''` |  |  |
| 6 | `itemcount` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `category` → `question_categories`(`id`)

### question_dataset_items

*Individual dataset items*

<sub>defined in `public/question/type/calculated/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `definition` | bigint(10) | NO | `0` | MUL |  |
| 3 | `itemnumber` | bigint(10) | NO | `0` |  |  |
| 4 | `value` | varchar(255) | NO | `''` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `definition`

### question_datasets

*Many-many relation between questions and dataset definitions*

<sub>defined in `public/question/type/calculated/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `question` | bigint(10) | NO | `0` | MUL |  |
| 3 | `datasetdefinition` | bigint(10) | NO | `0` | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `question` → `question`(`id`)
- **FK** `datasetdefinition` → `question_dataset_definitions`(`id`)
- **Index**: `question`, `datasetdefinition`

### question_ddwtos

*Defines drag and drop (words into sentences) questions*

<sub>defined in `public/question/type/ddwtos/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `questionid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `shuffleanswers` | smallint(4) | NO | `1` |  |  |
| 4 | `correctfeedback` | longtext | NO |  |  | Feedback shown for any correct response. |
| 5 | `correctfeedbackformat` | tinyint(2) | NO | `0` |  |  |
| 6 | `partiallycorrectfeedback` | longtext | NO |  |  | Feedback shown for any partially correct response. |
| 7 | `partiallycorrectfeedbackformat` | tinyint(2) | NO | `0` |  |  |
| 8 | `incorrectfeedback` | longtext | NO |  |  | Feedback shown for any incorrect response. |
| 9 | `incorrectfeedbackformat` | tinyint(2) | NO | `0` |  |  |
| 10 | `shownumcorrect` | tinyint(2) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `questionid` → `question`(`id`)

### question_gapselect

*Defines select missing words questions*

<sub>defined in `public/question/type/gapselect/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `questionid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `shuffleanswers` | smallint(4) | NO | `1` |  |  |
| 4 | `correctfeedback` | longtext | NO |  |  | Feedback shown for any correct response. |
| 5 | `correctfeedbackformat` | tinyint(2) | NO | `0` |  |  |
| 6 | `partiallycorrectfeedback` | longtext | NO |  |  | Feedback shown for any partially correct response. |
| 7 | `partiallycorrectfeedbackformat` | tinyint(2) | NO | `0` |  |  |
| 8 | `incorrectfeedback` | longtext | NO |  |  | Feedback shown for any incorrect response. |
| 9 | `incorrectfeedbackformat` | tinyint(2) | NO | `0` |  |  |
| 10 | `shownumcorrect` | tinyint(2) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `questionid` → `question`(`id`)

### question_hints

*Stores the the part of the question definition that gives different feedback after each try in interactive and similar behaviours.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `questionid` | bigint(10) | NO |  | MUL |  |
| 3 | `hint` | longtext | NO |  |  | The text of the feedback to be given. |
| 4 | `hintformat` | smallint(4) | NO | `0` |  | The format of the hint. |
| 5 | `shownumcorrect` | tinyint(1) | YES | `NULL` |  | Whether the feedback should include a message about how many things the student got right. This is only applicable to certain question types (for example matching or multiple choice multiple-response). |
| 6 | `clearwrong` | tinyint(1) | YES | `NULL` |  | Whether any wrong choices should be cleared before the next try. Whether this is applicable, and what it means, depends on the question type, as with the shownumright option. |
| 7 | `options` | varchar(255) | YES | `NULL` |  | A space for any other question-type specific options. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `questionid` → `question`(`id`)

### question_multianswer

*Options for multianswer questions*

<sub>defined in `public/question/type/multianswer/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `question` | bigint(10) | NO | `0` | MUL |  |
| 3 | `sequence` | longtext | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `question` → `question`(`id`)

### question_numerical

*Options for numerical questions.*

<sub>defined in `public/question/type/numerical/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `question` | bigint(10) | NO | `0` | MUL | Redundant, because of the answer field. Foreign key references question.id. |
| 3 | `answer` | bigint(10) | NO | `0` | MUL | Foreign key references question_answers.id. |
| 4 | `tolerance` | varchar(255) | NO | `'0.0'` |  | Allowed error when matching a response to this answer. I don't know why this is stored as a string. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `question` → `question`(`id`)
- **Index**: `answer`

### question_numerical_options

*Options for questions of type numerical This table is also used by the calculated question type*

<sub>defined in `public/question/type/numerical/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `question` | bigint(10) | NO | `0` | MUL |  |
| 3 | `showunits` | smallint(4) | NO | `0` |  | How units are handled: 3) Not used at all, 0) Optional, or 1) must be right or penalty applied. |
| 4 | `unitsleft` | smallint(4) | NO | `0` |  | display the unit at left as in $1.00 |
| 5 | `unitgradingtype` | smallint(4) | NO | `0` |  | 0 no penalty, 1 fraction response grade, 2 fraction total grade |
| 6 | `unitpenalty` | decimal(12,7) | NO | `0.1000000` |  | Penalty for getting the unit wrong, when they are being graded. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `question` → `question`(`id`)

### question_numerical_units

*Optional unit options for numerical questions. This table is also used by the calculated question type.*

<sub>defined in `public/question/type/numerical/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `question` | bigint(10) | NO | `0` | MUL | Foreign key references question.id |
| 3 | `multiplier` | decimal(38,19) | NO | `1.0000000000000000000` |  | The multiplier for this unit. For example, if the first unit is (1.0, 'cm'), another unit might be (0.1, 'mm') or (100.0, 'm'). |
| 4 | `unit` | varchar(50) | NO | `''` |  | The unit. For example 'm' or 'kg'. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `question` → `question`(`id`)
- **Index** (unique): `question`, `unit`

### question_references

*Records where a specific question is used.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `usingcontextid` | bigint(10) | NO | `0` | MUL | Context where question is used. |
| 3 | `component` | varchar(100) | YES | `NULL` |  | Component (e.g. mod_quiz or core_question) |
| 4 | `questionarea` | varchar(50) | YES | `NULL` |  | Depending on the component, which area the question is used in (e.g. slot for quiz). |
| 5 | `itemid` | bigint(10) | YES | `NULL` |  | Plugin specific id (e.g. slotid for quiz) where its used. |
| 6 | `questionbankentryid` | bigint(10) | NO | `0` | MUL | ID of the question bank entry this question is part of. |
| 7 | `version` | bigint(10) | YES | `NULL` |  | Version number for the question where NULL means use the latest non-draft version. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `usingcontextid` → `context`(`id`)
- **FK** `questionbankentryid` → `question_bank_entries`(`id`)
- **Index** (unique): `usingcontextid`, `component`, `questionarea`, `itemid`

### question_response_analysis

*Analysis of student responses given to questions.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `hashcode` | varchar(40) | NO | `''` | MUL | sha1 hash of serialized qubaids_condition class. Unique for every combination of class name and property. |
| 3 | `whichtries` | varchar(255) | NO | `''` |  |  |
| 4 | `timemodified` | bigint(10) | NO |  |  |  |
| 5 | `questionid` | bigint(10) | NO |  | MUL |  |
| 6 | `variant` | bigint(10) | YES | `NULL` |  |  |
| 7 | `subqid` | varchar(100) | NO | `''` |  |  |
| 8 | `aid` | varchar(100) | YES | `NULL` |  |  |
| 9 | `response` | longtext | YES | `NULL` |  |  |
| 10 | `credit` | decimal(15,5) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `questionid` → `question`(`id`)
- **Index**: `hashcode`

### question_response_count

*Count for each responses for each try at a question.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `analysisid` | bigint(10) | NO |  | MUL |  |
| 3 | `try` | bigint(10) | NO |  |  |  |
| 4 | `rcount` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `analysisid` → `question_response_analysis`(`id`)

### question_set_references

*Records where groups of questions are used.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `usingcontextid` | bigint(10) | NO | `0` | MUL | Context where question is used. |
| 3 | `component` | varchar(100) | YES | `NULL` |  | Component (e.g. mod_quiz) |
| 4 | `questionarea` | varchar(50) | YES | `NULL` |  | Depending on the component, which area the question is used in (e.g. slot for quiz). |
| 5 | `itemid` | bigint(10) | YES | `NULL` |  | Plugin specific id (e.g. slotid for quiz) where its used. |
| 6 | `questionscontextid` | bigint(10) | NO | `0` | MUL | Context questions come from. |
| 7 | `filtercondition` | longtext | YES | `NULL` |  | Filter expression in json format |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `usingcontextid` → `context`(`id`)
- **FK** `questionscontextid` → `context`(`id`)
- **Index** (unique): `usingcontextid`, `component`, `questionarea`, `itemid`

### question_statistics

*Statistics for individual questions used in an activity.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `hashcode` | varchar(40) | NO | `''` | MUL | sha1 hash of serialized qubaids_condition class. Unique for every combination of class name and property. |
| 3 | `timemodified` | bigint(10) | NO |  |  |  |
| 4 | `questionid` | bigint(10) | NO |  | MUL |  |
| 5 | `slot` | bigint(10) | YES | `NULL` |  | The position in the quiz where this question appears |
| 6 | `subquestion` | smallint(4) | NO |  |  |  |
| 7 | `variant` | bigint(10) | YES | `NULL` |  |  |
| 8 | `s` | bigint(10) | NO | `0` |  |  |
| 9 | `effectiveweight` | decimal(15,5) | YES | `NULL` |  |  |
| 10 | `negcovar` | tinyint(2) | NO | `0` |  |  |
| 11 | `discriminationindex` | decimal(15,5) | YES | `NULL` |  |  |
| 12 | `discriminativeefficiency` | decimal(15,5) | YES | `NULL` |  |  |
| 13 | `sd` | decimal(15,10) | YES | `NULL` |  |  |
| 14 | `facility` | decimal(15,10) | YES | `NULL` |  |  |
| 15 | `subquestions` | longtext | YES | `NULL` |  |  |
| 16 | `maxmark` | decimal(12,7) | YES | `NULL` |  |  |
| 17 | `positions` | longtext | YES | `NULL` |  | positions in which this item appears. Only used for random questions. |
| 18 | `randomguessscore` | decimal(12,7) | YES | `NULL` |  | An estimate of the score a student would get by guessing randomly. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `questionid` → `question`(`id`)
- **Index**: `hashcode`

### question_truefalse

*Options for True-False questions*

<sub>defined in `public/question/type/truefalse/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `question` | bigint(10) | NO | `0` | MUL | Foreign key references question.id. |
| 3 | `trueanswer` | bigint(10) | NO | `0` |  | Foreign key references question_answers.id. The 'True' choice. |
| 4 | `falseanswer` | bigint(10) | NO | `0` |  | Foreign key references question_answers.id. The 'False' choice. |
| 5 | `showstandardinstruction` | tinyint(2) | NO | `1` |  | Whether standard instruction ('Select one:') is displayed |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `question` → `question`(`id`)

### question_usages

*This table's main purpose it to assign a unique id to each attempt at a set of questions by some part of Moodle. A question usage is made up of a number of question_attempts.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `contextid` | bigint(10) | NO |  | MUL | Every question usage must be associated with some context. |
| 3 | `component` | varchar(255) | NO | `''` |  | The plugin this attempt belongs to, e.g. 'mod_quiz', 'block_questionoftheday', 'filter_embedquestion'. |
| 4 | `preferredbehaviour` | varchar(32) | NO | `''` |  | The archetypal behaviour that should be used for question attempts in this usage. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `contextid` → `context`(`id`)

### question_versions

*A join table linking the different question version definitions in the question table to the question_bank_entires.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `questionbankentryid` | bigint(10) | NO | `0` | MUL | ID of the question bank entry this question version is part of. |
| 3 | `version` | bigint(10) | NO | `1` |  | Version number for the question where the first version is always 1. |
| 4 | `questionid` | bigint(10) | NO | `0` | MUL | The question ID. |
| 5 | `status` | varchar(10) | NO | `'ready'` |  | If the question is ready, hidden or draft |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `questionbankentryid` → `question_bank_entries`(`id`)
- **FK** `questionid` → `question`(`id`)
- **Index** (unique): `questionbankentryid`, `version`

### quiz

*The settings for each quiz.*

<sub>defined in `public/mod/quiz/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | Standard Moodle primary key. (auto-increment) |
| 2 | `course` | bigint(10) | NO | `0` | MUL | Foreign key reference to the course this quiz is part of. |
| 3 | `name` | varchar(1333) | NO | `''` |  | Quiz name. |
| 4 | `intro` | longtext | NO |  |  | Quiz introduction text. |
| 5 | `introformat` | smallint(4) | NO | `0` |  | Quiz intro text format. |
| 6 | `timeopen` | bigint(10) | NO | `0` |  | The time when this quiz opens. (0 = no restriction.) |
| 7 | `timeclose` | bigint(10) | NO | `0` |  | The time when this quiz closes. (0 = no restriction.) |
| 8 | `timelimit` | bigint(10) | NO | `0` |  | The time limit for quiz attempts, in seconds. |
| 9 | `overduehandling` | varchar(16) | NO | `'autoabandon'` |  | The method used to handle overdue attempts. 'autosubmit', 'graceperiod' or 'autoabandon'. |
| 10 | `graceperiod` | bigint(10) | NO | `0` |  | The amount of time (in seconds) after the time limit runs out during which attempts can still be submitted, if overduehandling is set to allow it. |
| 11 | `preferredbehaviour` | varchar(32) | NO | `''` |  | The behaviour to ask questions to use. |
| 12 | `canredoquestions` | smallint(4) | NO | `0` |  | Allows students to redo any completed question within a quiz attempt. |
| 13 | `attempts` | mediumint(6) | NO | `0` |  | The maximum number of attempts a student is allowed. |
| 14 | `attemptonlast` | smallint(4) | NO | `0` |  | Whether subsequent attempts start from the answer to the previous attempt (1) or start blank (0). |
| 15 | `grademethod` | smallint(4) | NO | `1` |  | One of the values QUIZ_GRADEHIGHEST, QUIZ_GRADEAVERAGE, QUIZ_ATTEMPTFIRST or QUIZ_ATTEMPTLAST. |
| 16 | `decimalpoints` | smallint(4) | NO | `2` |  | Number of decimal points to use when displaying grades. |
| 17 | `questiondecimalpoints` | smallint(4) | NO | `-1` |  | Number of decimal points to use when displaying question grades. (-1 means use decimalpoints.) |
| 18 | `reviewattempt` | mediumint(6) | NO | `0` |  | Whether users are allowed to review their quiz attempts at various times. This is a bit field, decoded by the \mod_quiz\question\display_options class. It is formed by ORing together the constants defined there. |
| 19 | `reviewcorrectness` | mediumint(6) | NO | `0` |  | Whether users are allowed to review the correctness of the questions in their quiz attempts at various times. A bit field, like reviewattempt. |
| 20 | `reviewmaxmarks` | mediumint(6) | NO | `0` |  | Works with reviewmarks to control whether users can see grades at various times. 0 here means no grade information is shown at all. If 1, student can see the number of marks available for this question, and reviewmarks applies. A bit field, like reviewattempt. |
| 21 | `reviewmarks` | mediumint(6) | NO | `0` |  | Works with reviewmaxmarks to control whether users can see grades at various times. If reviewmaxmarks is 1, then this controls whether students can see the the mark they got for the question, in addition to the max. A bit field, like reviewattempt. |
| 22 | `reviewspecificfeedback` | mediumint(6) | NO | `0` |  | Whether users are allowed to see the specific feedback in their quiz attempts. A bit field, like reviewattempt. |
| 23 | `reviewgeneralfeedback` | mediumint(6) | NO | `0` |  | Whether users are allowed to see the general feedback in their quiz attempts. A bit field, like reviewattempt. |
| 24 | `reviewrightanswer` | mediumint(6) | NO | `0` |  | Whether users are allowed to see the right answer in their quiz attempts. A bit field, like reviewattempt. |
| 25 | `reviewoverallfeedback` | mediumint(6) | NO | `0` |  | Whether users are allowed to see the overall feedback in their quiz attempts. A bit field, like reviewattempt. |
| 26 | `questionsperpage` | bigint(10) | NO | `0` |  | How often to insert a page break when editing the quiz, or when shuffling the question order. |
| 27 | `navmethod` | varchar(16) | NO | `'free'` |  | Any constraints on how the user is allowed to navigate around the quiz. Currently recognised values are 'free' and 'seq'. |
| 28 | `shuffleanswers` | smallint(4) | NO | `0` |  | Whether the parts of the question should be shuffled, in those question types that support it. |
| 29 | `sumgrades` | decimal(10,5) | NO | `0.00000` |  | The total of all the question instance maxmarks. |
| 30 | `grade` | decimal(10,5) | NO | `0.00000` |  | The total that the quiz overall grade is scaled to be out of. |
| 31 | `timecreated` | bigint(10) | NO | `0` |  | The time when the quiz was added to the course. |
| 32 | `timemodified` | bigint(10) | NO | `0` |  | Last modified time. |
| 33 | `password` | varchar(255) | NO | `''` |  | A password that the student must enter before starting or continuing a quiz attempt. |
| 34 | `subnet` | varchar(255) | NO | `''` |  | Used to restrict the IP addresses from which this quiz can be attempted. The format is as requried by the address_in_subnet function. |
| 35 | `browsersecurity` | varchar(32) | NO | `''` |  | Restriciton on the browser the student must use. E.g. 'securewindow'. |
| 36 | `delay1` | bigint(10) | NO | `0` |  | Delay that must be left between the first and second attempt, in seconds. |
| 37 | `delay2` | bigint(10) | NO | `0` |  | Delay that must be left between the second and subsequent attempt, in seconds. |
| 38 | `showuserpicture` | smallint(4) | NO | `0` |  | Option to show the user's picture during the attempt and on the review page. |
| 39 | `showblocks` | smallint(4) | NO | `0` |  | Whether blocks should be shown on the attempt.php and review.php pages. |
| 40 | `completionattemptsexhausted` | tinyint(1) | YES | `0` |  |  |
| 41 | `completionminattempts` | bigint(10) | NO | `0` |  |  |
| 42 | `allowofflineattempts` | tinyint(1) | YES | `0` |  | Whether to allow the quiz to be attempted offline in the mobile app |
| 43 | `precreateattempts` | tinyint(1) | YES | `NULL` |  | Pre-create attempts for this quiz? This setting has no effect unless the precreateperiod config setting is set and unlocked. |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `course`

### quiz_attempts

*Stores users attempts at quizzes.*

<sub>defined in `public/mod/quiz/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | Standard Moodle primary key. (auto-increment) |
| 2 | `quiz` | bigint(10) | NO | `0` | MUL | Foreign key reference to the quiz that was attempted. |
| 3 | `userid` | bigint(10) | NO | `0` | MUL | Foreign key reference to the user whose attempt this is. |
| 4 | `attempt` | mediumint(6) | NO | `0` |  | Sequentially numbers this student's attempts at this quiz. |
| 5 | `uniqueid` | bigint(10) | NO | `0` | UNI | Foreign key reference to the question_usage that holds the details of the the question_attempts that make up this quiz attempt. |
| 6 | `layout` | longtext | NO |  |  |  |
| 7 | `currentpage` | bigint(10) | NO | `0` |  |  |
| 8 | `preview` | smallint(3) | NO | `0` |  |  |
| 9 | `state` | varchar(16) | NO | `'inprogress'` | MUL | The current state of the attempts. 'inprogress', 'overdue', 'finished' or 'abandoned'. |
| 10 | `timestart` | bigint(10) | NO | `0` |  | Time when the attempt was started. |
| 11 | `timefinish` | bigint(10) | NO | `0` |  | Time when the attempt was submitted. 0 if the attempt has not been submitted yet. |
| 12 | `timemodified` | bigint(10) | NO | `0` |  | Last modified time. |
| 13 | `timemodifiedoffline` | bigint(10) | NO | `0` |  | Last modified time via web services. |
| 14 | `timecheckstate` | bigint(10) | YES | `0` |  | Next time quiz cron should check attempt for state changes.  NULL means never check. |
| 15 | `sumgrades` | decimal(10,5) | YES | `NULL` |  | Total marks for this attempt. |
| 16 | `gradednotificationsenttime` | bigint(10) | YES | `NULL` |  | The timestamp when the 'graded' notification was sent. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `quiz` → `quiz`(`id`)
- **FK** `userid` → `user`(`id`)
- **FK** `uniqueid` → `question_usages`(`id`) *(unique)*
- **Index** (unique): `quiz`, `userid`, `attempt`
- **Index**: `state`, `timecheckstate`

### quiz_feedback

*Feedback given to students based on which grade band their overall score lies.*

<sub>defined in `public/mod/quiz/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `quizid` | bigint(10) | NO | `0` | MUL | Foreign key references quiz.id. |
| 3 | `feedbacktext` | longtext | NO |  |  | The feedback to show for a attempt where mingrade <= attempt grade < maxgrade. See function quiz_feedback_for_grade in mod/quiz/locallib.php. |
| 4 | `feedbacktextformat` | tinyint(2) | NO | `0` |  |  |
| 5 | `mingrade` | decimal(10,5) | NO | `0.00000` |  | The lower limit of this grade band. Inclusive. |
| 6 | `maxgrade` | decimal(10,5) | NO | `0.00000` |  | The upper limit of this grade band. Exclusive. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `quizid` → `quiz`(`id`)

### quiz_grade_items

*Where a quiz supports mulitple grades, this table stores what those grade items are.*

<sub>defined in `public/mod/quiz/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `quizid` | bigint(10) | NO |  | MUL | Foreign key references quiz.id. |
| 3 | `sortorder` | bigint(10) | NO |  |  | Used to control the order of the grade items when they are displayed |
| 4 | `name` | varchar(255) | NO | `''` |  | The name of this grade-item. PARAM_TEXT. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `quizid` → `quiz`(`id`)
- **Index** (unique): `quizid`, `sortorder`

### quiz_grades

*Stores the overall grade for each user on the quiz, based on their various attempts and the quiz.grademethod setting.*

<sub>defined in `public/mod/quiz/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `quiz` | bigint(10) | NO | `0` | MUL | Foreign key references quiz.id. |
| 3 | `userid` | bigint(10) | NO | `0` | MUL | Foreign key references user.id. |
| 4 | `grade` | decimal(10,5) | NO | `0.00000` |  | The overall grade from the quiz. Not affected by overrides in the gradebook. |
| 5 | `timemodified` | bigint(10) | NO | `0` |  | The last time this grade changed. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `quiz` → `quiz`(`id`)
- **Index**: `userid`

### quiz_overrides

*The overrides to quiz settings on a per-user and per-group basis.*

<sub>defined in `public/mod/quiz/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `quiz` | bigint(10) | NO | `0` | MUL | Foreign key references quiz.id |
| 3 | `groupid` | bigint(10) | YES | `NULL` | MUL | Foreign key references groups.id.  Can be null if this is a per-user override. |
| 4 | `userid` | bigint(10) | YES | `NULL` | MUL | Foreign key references user.id.  Can be null if this is a per-group override. |
| 5 | `timeopen` | bigint(10) | YES | `NULL` |  | Time at which students may start attempting this quiz. Can be null, in which case the quiz default is used. |
| 6 | `timeclose` | bigint(10) | YES | `NULL` |  | Time by which students must have completed their attempt.  Can be null, in which case the quiz default is used. |
| 7 | `timelimit` | bigint(10) | YES | `NULL` |  | Time limit in seconds.  Can be null, in which case the quiz default is used. |
| 8 | `attempts` | mediumint(6) | YES | `NULL` |  |  |
| 9 | `password` | varchar(255) | YES | `NULL` |  | Quiz password.  Can be null, in which case the quiz default is used. |
| 10 | `reason` | longtext | YES | `NULL` |  | An optional reason explaining why this override was granted. |
| 11 | `reasonformat` | tinyint(2) | NO | `0` |  | The internal format for the override reason. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `quiz` → `quiz`(`id`)
- **FK** `groupid` → `groups`(`id`)
- **FK** `userid` → `user`(`id`)

### quiz_overview_regrades

*This table records which question attempts need regrading and the grade they will be regraded to.*

<sub>defined in `public/mod/quiz/report/overview/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `questionusageid` | bigint(10) | NO |  | MUL | Foreign key references question_usages.id, or equivalently quiz_attempt.uniqueid. |
| 3 | `slot` | bigint(10) | NO |  |  | Foreign key, references question_attempts.slot |
| 4 | `newfraction` | decimal(12,7) | YES | `NULL` |  | The new fraction for this question_attempt after regrading. |
| 5 | `oldfraction` | decimal(12,7) | YES | `NULL` |  | The previous fraction for this question_attempt. |
| 6 | `regraded` | smallint(4) | NO |  |  | set to 0 if element has just been regraded. Set to 1 if element has been marked as needing regrading. |
| 7 | `timemodified` | bigint(10) | NO |  |  | Timestamp of when this row was last modified. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `questionusageid`, `slot` → `question_attempts`(`questionusageid`, `slot`)

### quiz_reports

*Lists all the installed quiz reports and their display order and so on. No need to worry about deleting old records. Only records with an equivalent directory are displayed.*

<sub>defined in `public/mod/quiz/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `name` | varchar(255) | YES | `NULL` | UNI | name of the report, same as the directory name |
| 3 | `displayorder` | bigint(10) | NO |  |  | display order for report tabs |
| 4 | `capability` | varchar(255) | YES | `NULL` |  | Capability required to see this report. May be blank which means use the default of mod/quiz:viewreport. This is used when deciding which tabs to render. |

**Keys & indexes**

- **Primary key:** `id`
- **Index** (unique): `name`

### quiz_sections

*Stores sections of a quiz with section name (heading), from slot-number N and whether the question order should be shuffled.*

<sub>defined in `public/mod/quiz/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `quizid` | bigint(10) | NO |  | MUL | Foreign key references quiz.id. |
| 3 | `firstslot` | bigint(10) | NO |  |  | Number of the first slot in the section. The section runs from here to the start of the next section, or the end of the quiz. |
| 4 | `heading` | varchar(1333) | YES | `NULL` |  | The text of the heading. May be an empty string/null. Multilang format. |
| 5 | `shufflequestions` | smallint(4) | NO | `0` |  | Whether the question order within this section should be shuffled for each attempt. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `quizid` → `quiz`(`id`)
- **Index** (unique): `quizid`, `firstslot`

### quiz_slots

*Stores the question used in a quiz, with the order, and for each question, which page it appears on, and the maximum mark (weight).*

<sub>defined in `public/mod/quiz/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `slot` | bigint(10) | NO |  |  | Where this question comes in order in the list of questions in this quiz. Like question_attempts.slot. |
| 3 | `quizid` | bigint(10) | NO | `0` | MUL | Foreign key references quiz.id. |
| 4 | `page` | bigint(10) | NO |  |  | The page number that this questions appears on. If the question in slot n appears on page p, then the question in slot n+1 must appear on page p or p+1. Well, except that when a quiz is being created, there may be empty pages, which would cause the page number to jump here. |
| 5 | `displaynumber` | varchar(16) | YES | `NULL` |  | Stores customised question number such as 1.2, A1, B12. If this is null, the default number is used. |
| 6 | `requireprevious` | smallint(4) | NO | `0` |  | Set to 1 when current question requires previous one to be answered first. |
| 7 | `maxmark` | decimal(12,7) | NO | `0.0000000` |  | How many marks this question contributes to quiz.sumgrades. |
| 8 | `quizgradeitemid` | bigint(10) | YES | `NULL` | MUL | If the quiz suports multiple sub-grades, which one this slot contributes, if any. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `quizid` → `quiz`(`id`)
- **FK** `quizgradeitemid` → `quiz_grade_items`(`id`)
- **Index** (unique): `quizid`, `slot`

### quiz_statistics

*table to cache results from analysis done in statistics report for quizzes.*

<sub>defined in `public/mod/quiz/report/statistics/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `hashcode` | varchar(40) | NO | `''` | MUL | sha1 hash of serialized qubaids_condition class. Unique for every combination of class name and property. |
| 3 | `whichattempts` | smallint(4) | NO |  |  | bool used to indicate whether these stats are for all attempts or just for the first. |
| 4 | `timemodified` | bigint(10) | NO |  |  |  |
| 5 | `firstattemptscount` | bigint(10) | NO |  |  |  |
| 6 | `highestattemptscount` | bigint(10) | NO |  |  |  |
| 7 | `lastattemptscount` | bigint(10) | NO |  |  |  |
| 8 | `allattemptscount` | bigint(10) | NO |  |  |  |
| 9 | `firstattemptsavg` | decimal(15,5) | YES | `NULL` |  |  |
| 10 | `highestattemptsavg` | decimal(15,5) | YES | `NULL` |  |  |
| 11 | `lastattemptsavg` | decimal(15,5) | YES | `NULL` |  |  |
| 12 | `allattemptsavg` | decimal(15,5) | YES | `NULL` |  |  |
| 13 | `median` | decimal(15,5) | YES | `NULL` |  |  |
| 14 | `standarddeviation` | decimal(15,5) | YES | `NULL` |  |  |
| 15 | `skewness` | decimal(15,10) | YES | `NULL` |  |  |
| 16 | `kurtosis` | decimal(15,5) | YES | `NULL` |  |  |
| 17 | `cic` | decimal(15,10) | YES | `NULL` |  |  |
| 18 | `errorratio` | decimal(15,10) | YES | `NULL` |  |  |
| 19 | `standarderror` | decimal(15,10) | YES | `NULL` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `hashcode`

### quizaccess_seb_quizsettings

*Stores the quiz level Safe Exam Browser configuration.*

<sub>defined in `public/mod/quiz/accessrule/seb/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `quizid` | bigint(10) | NO |  | UNI | Foreign key to quiz id. |
| 3 | `cmid` | bigint(10) | NO |  | UNI | Foreign key to course module id. |
| 4 | `templateid` | bigint(10) | NO |  | MUL | Foreign key to quizaccess_seb_template.id. |
| 5 | `requiresafeexambrowser` | tinyint(1) | NO |  |  | Bool whether to require SEB. |
| 6 | `showsebtaskbar` | tinyint(1) | YES | `NULL` |  | Bool to show SEB task bar |
| 7 | `showwificontrol` | tinyint(1) | YES | `NULL` |  | Bool to allow user to control networking. |
| 8 | `showreloadbutton` | tinyint(1) | YES | `NULL` |  | Bool to show reload button. |
| 9 | `showtime` | tinyint(1) | YES | `NULL` |  | Bool to show the clock. |
| 10 | `showkeyboardlayout` | tinyint(1) | YES | `NULL` |  | Bool to show keyboard layout. |
| 11 | `allowuserquitseb` | tinyint(1) | YES | `NULL` |  | Bool to show quit button. |
| 12 | `quitpassword` | longtext | YES | `NULL` |  | Quit password to exit SEB. |
| 13 | `linkquitseb` | longtext | YES | `NULL` |  | Link to exit SEB. |
| 14 | `userconfirmquit` | tinyint(1) | YES | `NULL` |  | Bool whether confirm quit popup should appear. |
| 15 | `enableaudiocontrol` | tinyint(1) | YES | `NULL` |  | Bool to show volume and audio controls. |
| 16 | `muteonstartup` | tinyint(1) | YES | `NULL` |  | Bool whether browser starts muted. |
| 17 | `allowcapturecamera` | tinyint(1) | YES | `NULL` |  | Bool whether SEB may access camera. |
| 18 | `allowcapturemicrophone` | tinyint(1) | YES | `NULL` |  | Bool whether SEB may access microphone. |
| 19 | `allowspellchecking` | tinyint(1) | YES | `NULL` |  | Bool whether spell checking will happen in SEB. |
| 20 | `allowreloadinexam` | tinyint(1) | YES | `NULL` |  | Bool whether user can reload. |
| 21 | `activateurlfiltering` | tinyint(1) | YES | `NULL` |  | Bool whether URLs will be filtered. |
| 22 | `filterembeddedcontent` | tinyint(1) | YES | `NULL` |  | Bool wither embedded content will be filtered |
| 23 | `expressionsallowed` | longtext | YES | `NULL` |  | Comma or newline separated list of allowed expressions |
| 24 | `regexallowed` | longtext | YES | `NULL` |  | Regex of allowed URLs |
| 25 | `expressionsblocked` | longtext | YES | `NULL` |  | Comma or newline separated list of blocked expressions |
| 26 | `regexblocked` | longtext | YES | `NULL` |  | Regex of blocked URLs |
| 27 | `allowedbrowserexamkeys` | longtext | YES | `NULL` |  | List of allowed browser exam keys. |
| 28 | `showsebdownloadlink` | tinyint(1) | YES | `NULL` |  | Bool whether SEB download link should appear |
| 29 | `usermodified` | bigint(10) | NO | `0` | MUL |  |
| 30 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 31 | `timemodified` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `quizid` → `quiz`(`id`) *(unique)*
- **FK** `cmid` → `course_modules`(`id`) *(unique)*
- **FK** `templateid` → `quizaccess_seb_template`(`id`)
- **FK** `usermodified` → `user`(`id`)

### quizaccess_seb_template

*Templates for Safe Exam Browser configuration.*

<sub>defined in `public/mod/quiz/accessrule/seb/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `name` | varchar(255) | NO | `''` |  | Name of the template |
| 3 | `description` | longtext | NO |  |  |  |
| 4 | `content` | longtext | NO |  |  | Content of the template |
| 5 | `enabled` | tinyint(1) | NO |  |  |  |
| 6 | `sortorder` | bigint(10) | NO |  |  |  |
| 7 | `usermodified` | bigint(10) | NO | `0` | MUL |  |
| 8 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 9 | `timemodified` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `usermodified` → `user`(`id`)

### rating

*moodle ratings*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `contextid` | bigint(10) | NO |  | MUL |  |
| 3 | `component` | varchar(100) | NO | `''` | MUL |  |
| 4 | `ratingarea` | varchar(50) | NO | `''` |  |  |
| 5 | `itemid` | bigint(10) | NO |  |  |  |
| 6 | `scaleid` | bigint(10) | NO |  | MUL |  |
| 7 | `rating` | bigint(10) | NO |  |  |  |
| 8 | `userid` | bigint(10) | NO |  | MUL |  |
| 9 | `timecreated` | bigint(10) | NO |  |  |  |
| 10 | `timemodified` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `contextid` → `context`(`id`)
- **FK** `userid` → `user`(`id`)
- **FK** `scaleid` → `scale`(`id`)
- **Index**: `component`, `ratingarea`, `contextid`, `itemid`

### registration_hubs

*hub where the site is registered on with their associated token*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `token` | varchar(255) | NO | `''` |  | the token to communicate with the hub by web service |
| 3 | `hubname` | varchar(255) | NO | `''` |  |  |
| 4 | `huburl` | varchar(255) | NO | `''` |  |  |
| 5 | `confirmed` | tinyint(1) | NO | `0` |  |  |
| 6 | `secret` | varchar(255) | YES | `NULL` |  | the unique site identifier for this hub |
| 7 | `timemodified` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`

### reportbuilder_audience

*Defines report audience*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `reportid` | bigint(10) | NO |  | MUL |  |
| 3 | `heading` | varchar(255) | YES | `NULL` |  |  |
| 4 | `classname` | varchar(255) | NO | `''` |  |  |
| 5 | `configdata` | longtext | NO |  |  |  |
| 6 | `usercreated` | bigint(10) | NO | `0` | MUL |  |
| 7 | `usermodified` | bigint(10) | NO | `0` | MUL |  |
| 8 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 9 | `timemodified` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `reportid` → `reportbuilder_report`(`id`)
- **FK** `usercreated` → `user`(`id`)
- **FK** `usermodified` → `user`(`id`)

### reportbuilder_column

*Table to represent a report column*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `reportid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `uniqueidentifier` | varchar(255) | NO | `''` |  |  |
| 4 | `aggregation` | varchar(32) | YES | `NULL` |  |  |
| 5 | `heading` | varchar(255) | YES | `NULL` |  |  |
| 6 | `columnorder` | bigint(10) | NO |  |  |  |
| 7 | `sortenabled` | tinyint(1) | NO | `0` |  |  |
| 8 | `sortdirection` | tinyint(1) | NO |  |  |  |
| 9 | `sortorder` | bigint(10) | YES | `NULL` |  |  |
| 10 | `usercreated` | bigint(10) | NO | `0` | MUL |  |
| 11 | `usermodified` | bigint(10) | NO | `0` | MUL |  |
| 12 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 13 | `timemodified` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `reportid` → `reportbuilder_report`(`id`)
- **FK** `usercreated` → `user`(`id`)
- **FK** `usermodified` → `user`(`id`)

### reportbuilder_filter

*Table to represent a report filter/condition*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `reportid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `uniqueidentifier` | varchar(255) | NO | `''` |  |  |
| 4 | `heading` | varchar(255) | YES | `NULL` |  |  |
| 5 | `iscondition` | tinyint(1) | NO | `0` |  |  |
| 6 | `filterorder` | bigint(10) | NO |  |  |  |
| 7 | `usercreated` | bigint(10) | NO | `0` | MUL |  |
| 8 | `usermodified` | bigint(10) | NO | `0` | MUL |  |
| 9 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 10 | `timemodified` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `reportid` → `reportbuilder_report`(`id`)
- **FK** `usercreated` → `user`(`id`)
- **FK** `usermodified` → `user`(`id`)
- **Index** (unique): `reportid`, `uniqueidentifier`, `iscondition`

### reportbuilder_report

*Table to represent a report*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `name` | varchar(255) | YES | `NULL` |  |  |
| 3 | `source` | varchar(255) | NO | `''` |  |  |
| 4 | `type` | tinyint(2) | NO | `0` |  |  |
| 5 | `uniquerows` | tinyint(1) | NO | `0` |  |  |
| 6 | `conditiondata` | longtext | YES | `NULL` |  |  |
| 7 | `settingsdata` | longtext | YES | `NULL` |  |  |
| 8 | `contextid` | bigint(10) | NO |  | MUL |  |
| 9 | `component` | varchar(100) | NO | `''` |  |  |
| 10 | `area` | varchar(100) | NO | `''` |  |  |
| 11 | `itemid` | bigint(10) | NO | `0` |  |  |
| 12 | `usercreated` | bigint(10) | NO | `0` | MUL |  |
| 13 | `usermodified` | bigint(10) | NO | `0` | MUL |  |
| 14 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 15 | `timemodified` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `usercreated` → `user`(`id`)
- **FK** `usermodified` → `user`(`id`)
- **FK** `contextid` → `context`(`id`)

### reportbuilder_schedule

*Table to represent a report schedule*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `reportid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `name` | varchar(255) | NO | `''` |  |  |
| 4 | `enabled` | tinyint(1) | NO | `1` |  |  |
| 5 | `audiences` | longtext | YES | `NULL` |  |  |
| 6 | `classname` | varchar(255) | NO | `''` |  |  |
| 7 | `configdata` | longtext | NO |  |  |  |
| 8 | `format` | varchar(255) | NO | `''` |  |  |
| 9 | `userviewas` | bigint(10) | NO | `0` | MUL |  |
| 10 | `timescheduled` | bigint(10) | NO | `0` |  |  |
| 11 | `recurrence` | bigint(10) | NO | `0` |  |  |
| 12 | `timelastsent` | bigint(10) | NO | `0` |  |  |
| 13 | `timenextsend` | bigint(10) | NO | `0` |  |  |
| 14 | `usercreated` | bigint(10) | NO | `0` | MUL |  |
| 15 | `usermodified` | bigint(10) | NO | `0` | MUL |  |
| 16 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 17 | `timemodified` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `reportid` → `reportbuilder_report`(`id`)
- **FK** `userviewas` → `user`(`id`)
- **FK** `usercreated` → `user`(`id`)
- **FK** `usermodified` → `user`(`id`)

### reportbuilder_user_filter

*Defines user report filter*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `reportid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `filterdata` | longtext | NO |  |  |  |
| 4 | `usercreated` | bigint(10) | NO | `0` | MUL |  |
| 5 | `usermodified` | bigint(10) | NO | `0` | MUL |  |
| 6 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 7 | `timemodified` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `reportid` → `reportbuilder_report`(`id`)
- **FK** `usercreated` → `user`(`id`)
- **FK** `usermodified` → `user`(`id`)
- **Index** (unique): `reportid`, `usercreated`

### repository

*This table contains one entry for every configured external repository instance.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `type` | varchar(255) | NO | `''` |  |  |
| 3 | `visible` | tinyint(1) | YES | `1` |  |  |
| 4 | `sortorder` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`

### repository_instance_config

*The config for intances*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `instanceid` | bigint(10) | NO |  |  |  |
| 3 | `name` | varchar(255) | NO | `''` |  |  |
| 4 | `value` | longtext | YES | `NULL` |  |  |

**Keys & indexes**

- **Primary key:** `id`

### repository_instances

*This table contains one entry for every configured external repository instance.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `name` | varchar(255) | NO | `''` |  |  |
| 3 | `typeid` | bigint(10) | NO |  |  |  |
| 4 | `userid` | bigint(10) | NO | `0` | MUL |  |
| 5 | `contextid` | bigint(10) | NO |  | MUL |  |
| 6 | `username` | varchar(255) | YES | `NULL` |  |  |
| 7 | `password` | varchar(255) | YES | `NULL` |  |  |
| 8 | `timecreated` | bigint(10) | YES | `NULL` |  |  |
| 9 | `timemodified` | bigint(10) | YES | `NULL` |  |  |
| 10 | `readonly` | tinyint(1) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)
- **FK** `contextid` → `context`(`id`)

### repository_onedrive_access

*List of temporary access grants.*

<sub>defined in `public/repository/onedrive/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `timemodified` | bigint(10) | NO |  |  |  |
| 3 | `timecreated` | bigint(10) | NO |  |  |  |
| 4 | `usermodified` | bigint(10) | NO |  | MUL |  |
| 5 | `permissionid` | varchar(255) | NO | `''` |  | The permission id in OneDrive. |
| 6 | `itemid` | varchar(255) | NO | `''` |  | The item id in OneDrive. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `usermodified` → `user`(`id`)

### resource

*Each record is one resource and its config data*

<sub>defined in `public/mod/resource/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `course` | bigint(10) | NO | `0` | MUL |  |
| 3 | `name` | varchar(1333) | NO | `''` |  |  |
| 4 | `intro` | longtext | YES | `NULL` |  |  |
| 5 | `introformat` | smallint(4) | NO | `0` |  |  |
| 6 | `tobemigrated` | smallint(4) | NO | `0` |  |  |
| 7 | `legacyfiles` | smallint(4) | NO | `0` |  |  |
| 8 | `legacyfileslast` | bigint(10) | YES | `NULL` |  |  |
| 9 | `display` | smallint(4) | NO | `0` |  |  |
| 10 | `displayoptions` | longtext | YES | `NULL` |  |  |
| 11 | `filterfiles` | smallint(4) | NO | `0` |  |  |
| 12 | `revision` | bigint(10) | NO | `0` |  | incremented when after each file changes, solves browser caching issues |
| 13 | `timemodified` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `course`

### resource_old

*backup of all old resource instances from 1.9*

<sub>defined in `public/mod/resource/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `course` | bigint(10) | NO | `0` |  |  |
| 3 | `name` | varchar(255) | NO | `''` |  |  |
| 4 | `type` | varchar(30) | NO | `''` |  |  |
| 5 | `reference` | varchar(255) | NO | `''` |  |  |
| 6 | `intro` | longtext | YES | `NULL` |  |  |
| 7 | `introformat` | smallint(4) | NO | `0` |  |  |
| 8 | `alltext` | longtext | NO |  |  |  |
| 9 | `popup` | longtext | NO |  |  |  |
| 10 | `options` | varchar(255) | NO | `''` |  |  |
| 11 | `timemodified` | bigint(10) | NO | `0` |  |  |
| 12 | `oldid` | bigint(10) | NO |  | UNI |  |
| 13 | `cmid` | bigint(10) | YES | `NULL` | MUL |  |
| 14 | `newmodule` | varchar(50) | YES | `NULL` |  |  |
| 15 | `newid` | bigint(10) | YES | `NULL` |  |  |
| 16 | `migrated` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index** (unique): `oldid`
- **Index**: `cmid`

### role

*moodle roles*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `name` | varchar(255) | NO | `''` |  | Empty names are automatically localised |
| 3 | `shortname` | varchar(100) | NO | `''` | UNI |  |
| 4 | `description` | longtext | NO |  |  | Empty descriptions may be automatically localised |
| 5 | `sortorder` | bigint(10) | NO | `0` | UNI |  |
| 6 | `archetype` | varchar(30) | NO | `''` |  | Role archetype is used during install and role reset, marks admin role and helps in site settings |

**Keys & indexes**

- **Primary key:** `id`
- **Index** (unique): `sortorder`
- **Index** (unique): `shortname`

### role_allow_assign

*this defines what role can assign what role*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `roleid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `allowassign` | bigint(10) | NO | `0` | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `roleid` → `role`(`id`)
- **FK** `allowassign` → `role`(`id`)
- **Index** (unique): `roleid`, `allowassign`

### role_allow_override

*this defines what role can override what role*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `roleid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `allowoverride` | bigint(10) | NO | `0` | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `roleid` → `role`(`id`)
- **FK** `allowoverride` → `role`(`id`)
- **Index** (unique): `roleid`, `allowoverride`

### role_allow_switch

*This table stores which which other roles a user is allowed to switch to if they have one role.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `roleid` | bigint(10) | NO |  | MUL | The role the user has. |
| 3 | `allowswitch` | bigint(10) | NO |  | MUL | The id of a role that the user is allowed to switch to as a result of having this role. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `roleid` → `role`(`id`)
- **FK** `allowswitch` → `role`(`id`)
- **Index** (unique): `roleid`, `allowswitch`

### role_allow_view

*This table stores which which other roles a user is allowed to view to if they have one role.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `roleid` | bigint(10) | NO |  | MUL | The role the user has. |
| 3 | `allowview` | bigint(10) | NO |  | MUL | The id of a role that the user is allowed to view to as a result of having this role. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `roleid` → `role`(`id`)
- **FK** `allowview` → `role`(`id`)
- **Index** (unique): `roleid`, `allowview`

### role_assignments

*assigning roles in different context*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `roleid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `contextid` | bigint(10) | NO | `0` | MUL |  |
| 4 | `userid` | bigint(10) | NO | `0` | MUL |  |
| 5 | `timemodified` | bigint(10) | NO | `0` |  |  |
| 6 | `modifierid` | bigint(10) | NO | `0` |  |  |
| 7 | `component` | varchar(100) | NO | `''` | MUL | plugin responsible responsible for role assignment, empty when manually assigned |
| 8 | `itemid` | bigint(10) | NO | `0` |  | Id of enrolment/auth instance responsible for this role assignment |
| 9 | `sortorder` | bigint(10) | NO | `0` | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `roleid` → `role`(`id`)
- **FK** `contextid` → `context`(`id`)
- **FK** `userid` → `user`(`id`)
- **Index**: `sortorder`
- **Index**: `roleid`, `contextid`
- **Index**: `userid`, `contextid`, `roleid`
- **Index**: `component`, `itemid`, `userid`

### role_capabilities

*permission has to be signed, overriding a capability for a particular role in a particular context*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `contextid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `roleid` | bigint(10) | NO | `0` | MUL |  |
| 4 | `capability` | varchar(255) | NO | `''` | MUL |  |
| 5 | `permission` | bigint(10) | NO | `0` |  |  |
| 6 | `timemodified` | bigint(10) | NO | `0` |  |  |
| 7 | `modifierid` | bigint(10) | NO | `0` | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `roleid` → `role`(`id`)
- **FK** `contextid` → `context`(`id`)
- **FK** `modifierid` → `user`(`id`)
- **FK** `capability` → `capabilities`(`name`)
- **Index** (unique): `roleid`, `contextid`, `capability`

### role_context_levels

*Lists which roles can be assigned at which context levels. The assignment is allowed in the corresponding row is present in this table.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `roleid` | bigint(10) | NO |  | MUL |  |
| 3 | `contextlevel` | bigint(10) | NO |  | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `roleid` → `role`(`id`)
- **Unique:** `contextlevel`, `roleid`

### role_names

*role names in native strings*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `roleid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `contextid` | bigint(10) | NO | `0` | MUL |  |
| 4 | `name` | varchar(255) | NO | `''` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `roleid` → `role`(`id`)
- **FK** `contextid` → `context`(`id`)
- **Index** (unique): `roleid`, `contextid`

### scale

*Defines grading scales*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `courseid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `userid` | bigint(10) | NO | `0` | MUL |  |
| 4 | `name` | varchar(255) | NO | `''` |  |  |
| 5 | `scale` | longtext | NO |  |  |  |
| 6 | `description` | longtext | NO |  |  |  |
| 7 | `descriptionformat` | tinyint(2) | NO | `0` |  |  |
| 8 | `timemodified` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)
- **Index**: `courseid`

### scale_history

*History table*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `action` | bigint(10) | NO | `0` | MUL | created/modified/deleted constants |
| 3 | `oldid` | bigint(10) | NO |  | MUL |  |
| 4 | `source` | varchar(255) | YES | `NULL` |  | What caused the modification? manual/module/import/... |
| 5 | `timemodified` | bigint(10) | YES | `NULL` | MUL | The last time this grade_item was modified |
| 6 | `loggeduser` | bigint(10) | YES | `NULL` | MUL | the userid of the person who last modified this outcome |
| 7 | `courseid` | bigint(10) | NO | `0` | MUL |  |
| 8 | `userid` | bigint(10) | NO | `0` | MUL |  |
| 9 | `name` | varchar(255) | NO | `''` |  |  |
| 10 | `scale` | longtext | NO |  |  |  |
| 11 | `description` | longtext | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `oldid` → `scale`(`id`)
- **FK** `courseid` → `course`(`id`)
- **FK** `loggeduser` → `user`(`id`)
- **FK** `userid` → `user`(`id`)
- **Index**: `action`
- **Index**: `timemodified`

### scorm

*each table is one SCORM module and its configuration*

<sub>defined in `public/mod/scorm/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `course` | bigint(10) | NO | `0` | MUL |  |
| 3 | `name` | varchar(1333) | NO | `''` |  |  |
| 4 | `scormtype` | varchar(50) | NO | `'local'` |  | local, external or repository |
| 5 | `reference` | varchar(255) | NO | `''` |  |  |
| 6 | `intro` | longtext | NO |  |  |  |
| 7 | `introformat` | smallint(4) | NO | `0` |  |  |
| 8 | `version` | varchar(9) | NO | `''` |  |  |
| 9 | `maxgrade` | double | NO | `0` |  |  |
| 10 | `grademethod` | tinyint(2) | NO | `0` |  |  |
| 11 | `whatgrade` | bigint(10) | NO | `0` |  |  |
| 12 | `maxattempt` | bigint(10) | NO | `1` |  |  |
| 13 | `forcecompleted` | tinyint(1) | NO | `0` |  |  |
| 14 | `forcenewattempt` | tinyint(1) | NO | `0` |  |  |
| 15 | `lastattemptlock` | tinyint(1) | NO | `0` |  |  |
| 16 | `masteryoverride` | tinyint(1) | NO | `1` |  |  |
| 17 | `displayattemptstatus` | tinyint(1) | NO | `1` |  |  |
| 18 | `displaycoursestructure` | tinyint(1) | NO | `0` |  |  |
| 19 | `updatefreq` | tinyint(1) | NO | `0` |  | Define when the package must be automatically update |
| 20 | `sha1hash` | varchar(40) | YES | `NULL` |  | package content or ext path hash |
| 21 | `md5hash` | varchar(32) | NO | `''` |  | MD5 Hash of package file |
| 22 | `revision` | bigint(10) | NO | `0` |  | revison number |
| 23 | `launch` | bigint(10) | NO | `0` |  |  |
| 24 | `skipview` | tinyint(1) | NO | `1` |  |  |
| 25 | `hidebrowse` | tinyint(1) | NO | `0` |  |  |
| 26 | `hidetoc` | tinyint(1) | NO | `0` |  |  |
| 27 | `nav` | tinyint(1) | NO | `1` |  |  |
| 28 | `navpositionleft` | bigint(10) | YES | `-100` |  |  |
| 29 | `navpositiontop` | bigint(10) | YES | `-100` |  |  |
| 30 | `auto` | tinyint(1) | NO | `0` |  |  |
| 31 | `popup` | tinyint(1) | NO | `0` |  |  |
| 32 | `options` | varchar(255) | NO | `''` |  |  |
| 33 | `width` | bigint(10) | NO | `100` |  |  |
| 34 | `height` | bigint(10) | NO | `600` |  |  |
| 35 | `timeopen` | bigint(10) | NO | `0` |  |  |
| 36 | `timeclose` | bigint(10) | NO | `0` |  |  |
| 37 | `timemodified` | bigint(10) | NO | `0` |  |  |
| 38 | `completionstatusrequired` | tinyint(1) | YES | `NULL` |  |  |
| 39 | `completionscorerequired` | bigint(10) | YES | `NULL` |  |  |
| 40 | `completionstatusallscos` | tinyint(1) | YES | `NULL` |  |  |
| 41 | `autocommit` | tinyint(1) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `course`

### scorm_aicc_session

*Used by AICC HACP to store session information*

<sub>defined in `public/mod/scorm/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO | `0` | MUL | id from user table |
| 3 | `scormid` | bigint(10) | NO | `0` | MUL | id from scorm table |
| 4 | `hacpsession` | varchar(255) | NO | `''` |  | sessionid used to authenticate AICC HACP communication |
| 5 | `scoid` | bigint(10) | YES | `0` |  | id from scorm_scoes table |
| 6 | `scormmode` | varchar(50) | YES | `NULL` |  |  |
| 7 | `scormstatus` | varchar(255) | YES | `NULL` |  |  |
| 8 | `attempt` | bigint(10) | YES | `NULL` |  |  |
| 9 | `lessonstatus` | varchar(255) | YES | `NULL` |  |  |
| 10 | `sessiontime` | varchar(255) | YES | `NULL` |  |  |
| 11 | `timecreated` | bigint(10) | NO | `0` |  | time this session was created |
| 12 | `timemodified` | bigint(10) | NO | `0` |  | time this session was last used |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `scormid` → `scorm`(`id`)
- **FK** `userid` → `user`(`id`)

### scorm_attempt

*List of SCORM attempts made by user.*

<sub>defined in `public/mod/scorm/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO |  | MUL |  |
| 3 | `scormid` | bigint(10) | NO |  | MUL | The id of the scorm table |
| 4 | `attempt` | bigint(10) | NO | `1` |  | The attempt number |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)
- **FK** `scormid` → `scorm`(`id`)

### scorm_element

*List of scorm elements.*

<sub>defined in `public/mod/scorm/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `element` | varchar(255) | NO | `''` | UNI | Name of SCORM element |

**Keys & indexes**

- **Primary key:** `id`
- **Index** (unique): `element`

### scorm_scoes

*each SCO part of the SCORM module*

<sub>defined in `public/mod/scorm/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `scorm` | bigint(10) | NO | `0` | MUL |  |
| 3 | `manifest` | varchar(255) | NO | `''` |  |  |
| 4 | `organization` | varchar(255) | NO | `''` |  |  |
| 5 | `parent` | varchar(255) | NO | `''` |  |  |
| 6 | `identifier` | varchar(255) | NO | `''` |  |  |
| 7 | `launch` | longtext | NO |  |  |  |
| 8 | `scormtype` | varchar(5) | NO | `''` |  |  |
| 9 | `title` | varchar(255) | NO | `''` |  |  |
| 10 | `sortorder` | bigint(10) | NO | `0` |  | order of scoes |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `scorm` → `scorm`(`id`)

### scorm_scoes_data

*Contains variable data get from packages*

<sub>defined in `public/mod/scorm/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `scoid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `name` | varchar(255) | NO | `''` |  |  |
| 4 | `value` | longtext | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `scoid` → `scorm_scoes`(`id`)

### scorm_scoes_value

*Values passed from SCORM package*

<sub>defined in `public/mod/scorm/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `scoid` | bigint(10) | NO |  | MUL | The id of the scorm_scoes table |
| 3 | `attemptid` | bigint(10) | NO |  | MUL | id from scorm_attempt |
| 4 | `elementid` | bigint(10) | NO |  | MUL | id from scorm_element |
| 5 | `value` | longtext | NO |  |  | Value passed from SCORM package |
| 6 | `timemodified` | bigint(10) | NO | `0` |  | Time value last changed. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `scoid` → `scorm_scoes`(`id`)
- **FK** `attemptid` → `scorm_attempt`(`id`)
- **FK** `elementid` → `scorm_element`(`id`)

### scorm_seq_mapinfo

*SCORM2004 objective mapinfo description*

<sub>defined in `public/mod/scorm/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `scoid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `objectiveid` | bigint(10) | NO | `0` | MUL |  |
| 4 | `targetobjectiveid` | bigint(10) | NO | `0` |  |  |
| 5 | `readsatisfiedstatus` | tinyint(1) | NO | `1` |  |  |
| 6 | `readnormalizedmeasure` | tinyint(1) | NO | `1` |  |  |
| 7 | `writesatisfiedstatus` | tinyint(1) | NO | `0` |  |  |
| 8 | `writenormalizedmeasure` | tinyint(1) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `scoid` → `scorm_scoes`(`id`)
- **FK** `objectiveid` → `scorm_seq_objective`(`id`)
- **Unique:** `scoid`, `id`, `objectiveid`

### scorm_seq_objective

*SCORM2004 objective description*

<sub>defined in `public/mod/scorm/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `scoid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `primaryobj` | tinyint(1) | NO | `0` |  |  |
| 4 | `objectiveid` | varchar(255) | NO | `''` |  |  |
| 5 | `satisfiedbymeasure` | tinyint(1) | NO | `1` |  |  |
| 6 | `minnormalizedmeasure` | float(11,4) | NO | `0.0000` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `scoid` → `scorm_scoes`(`id`)
- **Unique:** `scoid`, `id`

### scorm_seq_rolluprule

*SCORM2004 sequencing rule*

<sub>defined in `public/mod/scorm/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `scoid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `childactivityset` | varchar(15) | NO | `''` |  |  |
| 4 | `minimumcount` | bigint(10) | NO | `0` |  |  |
| 5 | `minimumpercent` | float(11,4) | NO | `0.0000` |  |  |
| 6 | `conditioncombination` | varchar(3) | NO | `'all'` |  |  |
| 7 | `action` | varchar(15) | NO | `''` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `scoid` → `scorm_scoes`(`id`)
- **Unique:** `scoid`, `id`

### scorm_seq_rolluprulecond

*SCORM2004 sequencing rule*

<sub>defined in `public/mod/scorm/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `scoid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `rollupruleid` | bigint(10) | NO | `0` | MUL |  |
| 4 | `operator` | varchar(5) | NO | `'noOp'` |  |  |
| 5 | `cond` | varchar(25) | NO | `''` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `scoid` → `scorm_scoes`(`id`)
- **FK** `rollupruleid` → `scorm_seq_rolluprule`(`id`)
- **Unique:** `scoid`, `rollupruleid`, `id`

### scorm_seq_rulecond

*SCORM2004 rule condition*

<sub>defined in `public/mod/scorm/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `scoid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `ruleconditionsid` | bigint(10) | NO | `0` | MUL |  |
| 4 | `refrencedobjective` | varchar(255) | NO | `''` |  |  |
| 5 | `measurethreshold` | float(11,4) | NO | `0.0000` |  |  |
| 6 | `operator` | varchar(5) | NO | `'noOp'` |  |  |
| 7 | `cond` | varchar(30) | NO | `'always'` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `scoid` → `scorm_scoes`(`id`)
- **FK** `ruleconditionsid` → `scorm_seq_ruleconds`(`id`)
- **Unique:** `id`, `scoid`, `ruleconditionsid`

### scorm_seq_ruleconds

*SCORM2004 rule conditions*

<sub>defined in `public/mod/scorm/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `scoid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `conditioncombination` | varchar(3) | NO | `'all'` |  |  |
| 4 | `ruletype` | tinyint(2) | NO | `0` |  |  |
| 5 | `action` | varchar(25) | NO | `''` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `scoid` → `scorm_scoes`(`id`)
- **Unique:** `scoid`, `id`

### search_index_requests

*Records requests for (re)indexing of specific contexts. Entries will be removed from this table when indexing of that context is complete. (This table is not used for normal time-based indexing of new content.)*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `contextid` | bigint(10) | NO |  | MUL | Context ID that has been requested for reindexing. |
| 3 | `searcharea` | varchar(255) | NO | `''` |  | Set (e.g. 'forum-post') if a specific area is to be reindexed. Blank indicates all areas. |
| 4 | `timerequested` | bigint(10) | NO |  |  | Time at which this index update was requested. |
| 5 | `partialarea` | varchar(255) | NO | `''` |  | If processing of this context partially completed, set to the area that needs processing next. Blank indicates not processed yet. |
| 6 | `partialtime` | bigint(10) | NO |  |  | If processing partially completed, set to the timestamp within the next area where processing should start. 0 indicates not processed yet. |
| 7 | `indexpriority` | bigint(10) | NO |  | MUL | Priority value so that important requests can be dealt with first; higher numbers are processed first |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `contextid` → `context`(`id`)
- **Index**: `indexpriority`, `timerequested`

### search_simpledb_index

*search_simpledb table containing the index data.*

<sub>defined in `public/search/engine/simpledb/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `docid` | varchar(255) | NO | `''` | UNI |  |
| 3 | `itemid` | bigint(10) | NO |  |  |  |
| 4 | `title` | longtext | YES | `NULL` | MUL |  |
| 5 | `content` | longtext | YES | `NULL` |  |  |
| 6 | `contextid` | bigint(10) | NO |  | MUL |  |
| 7 | `areaid` | varchar(255) | NO | `''` | MUL |  |
| 8 | `type` | tinyint(1) | NO |  |  |  |
| 9 | `courseid` | bigint(10) | NO |  | MUL |  |
| 10 | `owneruserid` | bigint(10) | YES | `NULL` | MUL |  |
| 11 | `modified` | bigint(10) | NO |  |  |  |
| 12 | `userid` | bigint(10) | YES | `NULL` |  |  |
| 13 | `description1` | longtext | YES | `NULL` |  |  |
| 14 | `description2` | longtext | YES | `NULL` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Unique:** `docid`
- **Index**: `owneruserid`, `contextid`
- **Index**: `contextid`
- **Index**: `courseid`
- **Index**: `areaid`

### sessions

*Database based session storage - now recommended*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `state` | bigint(10) | NO | `0` | MUL | 0 means normal session |
| 3 | `sid` | varchar(128) | NO | `''` | UNI | Session id |
| 4 | `userid` | bigint(10) | NO |  | MUL |  |
| 5 | `sessdata` | longtext | YES | `NULL` |  | session content |
| 6 | `timecreated` | bigint(10) | NO |  | MUL |  |
| 7 | `timemodified` | bigint(10) | NO |  | MUL |  |
| 8 | `firstip` | varchar(45) | YES | `NULL` |  |  |
| 9 | `lastip` | varchar(45) | YES | `NULL` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)
- **Index**: `state`
- **Index** (unique): `sid`
- **Index**: `timecreated`
- **Index**: `timemodified`

### shortlink

*Short codes for user short links*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `shortcode` | varchar(12) | NO | `''` | MUL | The shortcode to use for the short link |
| 3 | `userid` | bigint(10) | NO |  | MUL |  |
| 4 | `component` | varchar(100) | NO | `''` |  |  |
| 5 | `linktype` | varchar(100) | NO | `''` |  |  |
| 6 | `identifier` | varchar(1333) | NO | `''` |  | An identifier for this component / type combination |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)
- **Index** (unique): `userid`, `shortcode`
- **Index**: `shortcode`

### sms_gateways

*Instances of SMS gateways*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `name` | varchar(255) | NO | `''` |  |  |
| 3 | `gateway` | varchar(255) | NO | `''` |  |  |
| 4 | `enabled` | tinyint(2) | NO | `1` |  |  |
| 5 | `config` | longtext | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`

### sms_messages

*SMS Messages sent via the SMS subsystem*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `recipientnumber` | varchar(30) | NO | `''` |  |  |
| 3 | `content` | longtext | YES | `NULL` |  |  |
| 4 | `component` | varchar(100) | NO | `''` |  |  |
| 5 | `messagetype` | varchar(100) | NO | `''` |  |  |
| 6 | `recipientuserid` | bigint(10) | YES | `NULL` |  |  |
| 7 | `issensitive` | tinyint(2) | NO | `0` |  |  |
| 8 | `gatewayid` | bigint(10) | YES | `NULL` | MUL |  |
| 9 | `status` | varchar(100) | YES | `NULL` |  |  |
| 10 | `timecreated` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `gatewayid` → `sms_gateways`(`id`)

### stats_daily

*to accumulate daily stats*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `courseid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `timeend` | bigint(10) | NO | `0` | MUL |  |
| 4 | `roleid` | bigint(10) | NO | `0` | MUL | id of role for the aggregates |
| 5 | `stattype` | varchar(20) | NO | `'activity'` |  | type of stat |
| 6 | `stat1` | bigint(10) | NO | `0` |  | stat1. usually used for reads |
| 7 | `stat2` | bigint(10) | NO | `0` |  | stat2. usually used for writes. |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `courseid`
- **Index**: `timeend`
- **Index**: `roleid`

### stats_monthly

*To accumulate monthly stats*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `courseid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `timeend` | bigint(10) | NO | `0` | MUL |  |
| 4 | `roleid` | bigint(10) | NO | `0` | MUL | id of role for the aggregates |
| 5 | `stattype` | varchar(20) | NO | `'activity'` |  | type of stat |
| 6 | `stat1` | bigint(10) | NO | `0` |  | stat1. usually used for reads |
| 7 | `stat2` | bigint(10) | NO | `0` |  | stat2. usually used for writes. |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `courseid`
- **Index**: `timeend`
- **Index**: `roleid`

### stats_user_daily

*To accumulate daily stats per course/user*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `courseid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `userid` | bigint(10) | NO | `0` | MUL |  |
| 4 | `roleid` | bigint(10) | NO | `0` | MUL |  |
| 5 | `timeend` | bigint(10) | NO | `0` | MUL |  |
| 6 | `statsreads` | bigint(10) | NO | `0` |  |  |
| 7 | `statswrites` | bigint(10) | NO | `0` |  |  |
| 8 | `stattype` | varchar(30) | NO | `''` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `courseid`
- **Index**: `userid`
- **Index**: `roleid`
- **Index**: `timeend`

### stats_user_monthly

*To accumulate monthly stats per course/user*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `courseid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `userid` | bigint(10) | NO | `0` | MUL |  |
| 4 | `roleid` | bigint(10) | NO | `0` | MUL |  |
| 5 | `timeend` | bigint(10) | NO | `0` | MUL |  |
| 6 | `statsreads` | bigint(10) | NO | `0` |  |  |
| 7 | `statswrites` | bigint(10) | NO | `0` |  |  |
| 8 | `stattype` | varchar(30) | NO | `''` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `courseid`
- **Index**: `userid`
- **Index**: `roleid`
- **Index**: `timeend`

### stats_user_weekly

*To accumulate weekly stats per course/user*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `courseid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `userid` | bigint(10) | NO | `0` | MUL |  |
| 4 | `roleid` | bigint(10) | NO | `0` | MUL |  |
| 5 | `timeend` | bigint(10) | NO | `0` | MUL |  |
| 6 | `statsreads` | bigint(10) | NO | `0` |  |  |
| 7 | `statswrites` | bigint(10) | NO | `0` |  |  |
| 8 | `stattype` | varchar(30) | NO | `''` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `courseid`
- **Index**: `userid`
- **Index**: `roleid`
- **Index**: `timeend`

### stats_weekly

*To accumulate weekly stats*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `courseid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `timeend` | bigint(10) | NO | `0` | MUL |  |
| 4 | `roleid` | bigint(10) | NO | `0` | MUL | id of role for the aggregates |
| 5 | `stattype` | varchar(20) | NO | `'activity'` |  | type of stat |
| 6 | `stat1` | bigint(10) | NO | `0` |  | stat1. usually used for reads |
| 7 | `stat2` | bigint(10) | NO | `0` |  | stat2. usually used for writes. |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `courseid`
- **Index**: `timeend`
- **Index**: `roleid`

### stored_progress

*Records for any long running tasks we want to poll for progress*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `idnumber` | varchar(255) | NO | `''` | MUL |  |
| 3 | `timestart` | bigint(20) | YES | `NULL` |  |  |
| 4 | `lastupdate` | bigint(20) | YES | `NULL` |  |  |
| 5 | `percentcompleted` | decimal(5,2) | YES | `0.00` |  |  |
| 6 | `message` | varchar(255) | YES | `NULL` |  |  |
| 7 | `haserrored` | tinyint(1) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `idnumber`

### subsection

*Stores the delegated subsection instances.*

<sub>defined in `public/mod/subsection/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `course` | bigint(10) | NO | `0` | MUL |  |
| 3 | `name` | varchar(1333) | NO | `''` |  |  |
| 4 | `timemodified` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `course` → `course`(`id`)

### tag

*Tag table - this generic table will replace the old "tags" table.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO |  | MUL |  |
| 3 | `tagcollid` | bigint(10) | NO |  | MUL |  |
| 4 | `name` | varchar(255) | NO | `''` |  |  |
| 5 | `rawname` | varchar(255) | NO | `''` |  | The raw, unnormalised name for the tag as entered by users |
| 6 | `isstandard` | tinyint(1) | NO | `0` |  | Whether this tag is standard |
| 7 | `description` | longtext | YES | `NULL` |  |  |
| 8 | `descriptionformat` | tinyint(2) | NO | `0` |  |  |
| 9 | `flag` | smallint(4) | YES | `0` |  | a tag can be 'flagged' as inappropriate |
| 10 | `timemodified` | bigint(10) | YES | `NULL` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)
- **FK** `tagcollid` → `tag_coll`(`id`)
- **Index** (unique): `tagcollid`, `name`
- **Index**: `tagcollid`, `isstandard`

### tag_area

*Defines various tag areas, one area is identified by component and itemtype*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `component` | varchar(100) | NO | `''` | MUL |  |
| 3 | `itemtype` | varchar(100) | NO | `''` |  |  |
| 4 | `enabled` | tinyint(1) | NO | `1` |  |  |
| 5 | `tagcollid` | bigint(10) | NO |  | MUL |  |
| 6 | `callback` | varchar(100) | YES | `NULL` |  |  |
| 7 | `callbackfile` | varchar(100) | YES | `NULL` |  |  |
| 8 | `showstandard` | tinyint(1) | NO | `0` |  |  |
| 9 | `multiplecontexts` | tinyint(1) | NO | `0` |  | Whether the tag area allows tag instances to be created in multiple contexts. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `tagcollid` → `tag_coll`(`id`)
- **Index** (unique): `component`, `itemtype`

### tag_coll

*Defines different set of tags*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `name` | varchar(255) | YES | `NULL` |  |  |
| 3 | `isdefault` | tinyint(2) | NO | `0` |  |  |
| 4 | `component` | varchar(100) | YES | `NULL` |  |  |
| 5 | `sortorder` | mediumint(5) | NO | `0` |  |  |
| 6 | `searchable` | tinyint(2) | NO | `1` |  | Whether the tag collection is searchable |
| 7 | `customurl` | varchar(255) | YES | `NULL` |  | Custom URL for the tag page instead of /tag/index.php |

**Keys & indexes**

- **Primary key:** `id`

### tag_correlation

*The rationale for the 'tag_correlation' table is performance.   It works as a cache for a potentially heavy load query done at the 'tag_instance' table.   So, the 'tag_correlation' table stores redundant information derived from the 'tag_instance' table*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `tagid` | bigint(10) | NO |  | MUL |  |
| 3 | `correlatedtags` | longtext | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `tagid` → `tag`(`id`)

### tag_instance

*tag_instance table holds the information of associations between tags and other items*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `tagid` | bigint(10) | NO |  | MUL |  |
| 3 | `component` | varchar(100) | NO | `''` | MUL | Defines the Moodle component which the tag was added to |
| 4 | `itemtype` | varchar(100) | NO | `''` | MUL |  |
| 5 | `itemid` | bigint(10) | NO |  |  |  |
| 6 | `contextid` | bigint(10) | YES | `NULL` | MUL | The context id of the item that was tagged |
| 7 | `tiuserid` | bigint(10) | NO | `0` |  |  |
| 8 | `ordering` | bigint(10) | YES | `NULL` |  | Maintains the order of the tag instances of an item |
| 9 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 10 | `timemodified` | bigint(10) | NO | `0` |  | timemodified |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `tagid` → `tag`(`id`)
- **FK** `contextid` → `context`(`id`)
- **Index** (unique): `component`, `itemtype`, `itemid`, `contextid`, `tiuserid`, `tagid`
- **Index**: `itemtype`, `component`, `tagid`, `contextid`

### task_adhoc

*List of adhoc tasks waiting to run.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `component` | varchar(255) | NO | `''` |  | The component that triggered this adhoc task. |
| 3 | `classname` | varchar(255) | NO | `''` |  | The name of the class extending adhoc_task to run when this task is executed. |
| 4 | `nextruntime` | bigint(10) | NO |  | MUL |  |
| 5 | `faildelay` | bigint(10) | YES | `NULL` |  |  |
| 6 | `customdata` | longtext | YES | `NULL` |  | Custom data to be passed to the adhoc task. Must be serialisable using json_encode() |
| 7 | `userid` | bigint(10) | YES | `NULL` | MUL |  |
| 8 | `timecreated` | bigint(10) | NO | `0` |  | Timestamp of adhoc task creation |
| 9 | `timestarted` | bigint(10) | YES | `NULL` | MUL | Time when the task was started |
| 10 | `hostname` | varchar(255) | YES | `NULL` |  | Hostname where the task is running |
| 11 | `pid` | bigint(10) | YES | `NULL` |  | PHP process ID that is running the task |
| 12 | `attemptsavailable` | tinyint(2) | YES | `NULL` |  | The remaining attempts for this task |
| 13 | `firststartingtime` | bigint(10) | YES | `NULL` |  | The start time of the first run of the task |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)
- **Index**: `nextruntime`
- **Index**: `timestarted`
- **Index**: `nextruntime`, `classname`

### task_log

*The log table for all tasks*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `type` | smallint(4) | NO |  |  | The type of task. Scheduled task = 0; Adhoc task = 1. |
| 3 | `component` | varchar(255) | NO | `''` |  | The component that the task belongs to |
| 4 | `classname` | varchar(255) | NO | `''` | MUL | The class of the task being run |
| 5 | `userid` | bigint(10) | NO |  | MUL | The userid that the task was configured to run as (Adhoc tasks only) |
| 6 | `timestart` | decimal(20,10) | NO |  | MUL | The start time of the task |
| 7 | `timeend` | decimal(20,10) | NO |  |  | The end time of the task |
| 8 | `dbreads` | bigint(10) | NO |  |  | The number of DB reads performed during the task. |
| 9 | `dbwrites` | bigint(10) | NO |  |  | The number of DB writes performed during the task. |
| 10 | `result` | tinyint(2) | NO |  |  | Whether the task was successful or not. 0 = pass; 1 = fail. |
| 11 | `output` | longtext | NO |  |  |  |
| 12 | `hostname` | varchar(255) | YES | `NULL` |  | Hostname where the task was executed |
| 13 | `pid` | bigint(10) | YES | `NULL` |  | PHP process ID that was running the task |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)
- **Index**: `classname`
- **Index**: `timestart`

### task_scheduled

*List of scheduled tasks to be run by cron.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `component` | varchar(255) | NO | `''` |  | The component this scheduled task belongs to. |
| 3 | `classname` | varchar(255) | NO | `''` | UNI | The class extending scheduled_task to be called when running this task. |
| 4 | `lastruntime` | bigint(10) | YES | `NULL` | MUL |  |
| 5 | `nextruntime` | bigint(10) | YES | `NULL` |  |  |
| 6 | `minute` | varchar(200) | NO | `''` |  |  |
| 7 | `hour` | varchar(70) | NO | `''` |  |  |
| 8 | `day` | varchar(90) | NO | `''` |  |  |
| 9 | `month` | varchar(30) | NO | `''` |  |  |
| 10 | `dayofweek` | varchar(25) | NO | `''` |  |  |
| 11 | `faildelay` | bigint(10) | YES | `NULL` |  |  |
| 12 | `customised` | tinyint(2) | NO | `0` |  | Used on upgrades to prevent overwriting custom schedules. |
| 13 | `disabled` | tinyint(1) | NO | `0` |  | 1 means do not run from cron |
| 14 | `timestarted` | bigint(10) | YES | `NULL` |  | Time when the task was started |
| 15 | `hostname` | varchar(255) | YES | `NULL` |  | Hostname where the task is running |
| 16 | `pid` | bigint(10) | YES | `NULL` |  | PHP process ID that is running the task |

**Keys & indexes**

- **Primary key:** `id`
- **Index** (unique): `classname`
- **Index**: `lastruntime`, `nextruntime`

### tiny_autosave

*The content of the textarea saved during autosave operations*

<sub>defined in `public/lib/editor/tiny/plugins/autosave/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `elementid` | varchar(255) | NO | `''` | MUL | The unique id for the text editor in the form. |
| 3 | `contextid` | bigint(10) | NO |  |  | The contextid that the form was loaded with. |
| 4 | `pagehash` | varchar(64) | NO | `''` |  | The HTML DOM id of the page that loaded the form. |
| 5 | `userid` | bigint(10) | NO |  |  | The id of the user that loaded the form. |
| 6 | `drafttext` | longtext | NO |  |  | The draft text |
| 7 | `draftid` | bigint(10) | YES | `NULL` |  | Optional draft area id containing draft files. |
| 8 | `pageinstance` | varchar(64) | NO | `''` |  | The browser tab instance that last saved the draft text. This is to prevent multiple tabs from the same user saving different text alternately. |
| 9 | `timemodified` | bigint(10) | NO | `0` |  | Store the last modified time for the auto save text. |

**Keys & indexes**

- **Primary key:** `id`
- **Unique:** `elementid`, `contextid`, `userid`, `pagehash`

### tool_brickfield_areas

*Areas that have been checked for accessibility problems*

<sub>defined in `public/admin/tool/brickfield/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `type` | tinyint(2) | NO | `0` | MUL |  |
| 3 | `contextid` | bigint(10) | YES | `NULL` | MUL |  |
| 4 | `component` | varchar(100) | YES | `NULL` |  |  |
| 5 | `tablename` | varchar(40) | YES | `NULL` |  |  |
| 6 | `fieldorarea` | varchar(50) | YES | `NULL` |  |  |
| 7 | `itemid` | bigint(10) | YES | `NULL` |  |  |
| 8 | `filename` | varchar(1333) | YES | `NULL` |  |  |
| 9 | `reftable` | varchar(40) | YES | `NULL` | MUL |  |
| 10 | `refid` | bigint(10) | YES | `NULL` |  |  |
| 11 | `cmid` | bigint(10) | YES | `NULL` | MUL |  |
| 12 | `courseid` | bigint(10) | YES | `NULL` | MUL |  |
| 13 | `categoryid` | bigint(10) | YES | `NULL` | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `courseid` → `course`(`id`)
- **FK** `cmid` → `course_modules`(`id`)
- **FK** `categoryid` → `course_categories`(`id`)
- **FK** `contextid` → `context`(`id`)
- **Index**: `courseid`, `cmid`
- **Index**: `type`, `tablename`, `itemid`, `fieldorarea`
- **Index**: `type`, `contextid`, `component`, `fieldorarea`, `itemid`
- **Index**: `reftable`, `refid`, `type`

### tool_brickfield_cache_acts

*Contains accessibility summary information per activity.*

<sub>defined in `public/admin/tool/brickfield/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `courseid` | bigint(10) | NO |  | MUL |  |
| 3 | `status` | tinyint(1) | YES | `NULL` | MUL |  |
| 4 | `component` | varchar(64) | YES | `NULL` |  |  |
| 5 | `totalactivities` | bigint(10) | YES | `NULL` |  |  |
| 6 | `failedactivities` | bigint(10) | YES | `NULL` |  |  |
| 7 | `passedactivities` | bigint(10) | YES | `NULL` |  |  |
| 8 | `errorcount` | bigint(10) | YES | `NULL` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `courseid` → `course`(`id`)
- **Index**: `status`

### tool_brickfield_cache_check

*Contains accessibility summary information per check.*

<sub>defined in `public/admin/tool/brickfield/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `courseid` | bigint(10) | NO |  | MUL |  |
| 3 | `status` | tinyint(1) | YES | `NULL` | MUL |  |
| 4 | `checkid` | bigint(10) | YES | `NULL` |  |  |
| 5 | `checkcount` | bigint(10) | YES | `NULL` |  |  |
| 6 | `errorcount` | bigint(10) | YES | `NULL` | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `courseid` → `course`(`id`)
- **Index**: `status`
- **Index**: `errorcount`

### tool_brickfield_checks

*Checks details*

<sub>defined in `public/admin/tool/brickfield/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `checktype` | varchar(64) | YES | `NULL` | MUL |  |
| 3 | `shortname` | varchar(64) | YES | `NULL` |  |  |
| 4 | `checkgroup` | bigint(16) | YES | `0` | MUL | The group category identifier. |
| 5 | `status` | smallint(4) | NO |  | MUL |  |
| 6 | `severity` | tinyint(2) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `checktype`
- **Index**: `checkgroup`
- **Index**: `status`

### tool_brickfield_content

*Content of an area at a particular time (recognised by a hash)*

<sub>defined in `public/admin/tool/brickfield/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `areaid` | bigint(10) | NO |  | MUL |  |
| 3 | `contenthash` | varchar(40) | NO | `''` |  |  |
| 4 | `iscurrent` | tinyint(1) | NO | `0` | MUL |  |
| 5 | `status` | tinyint(2) | NO | `0` | MUL | 0 - needs checking, -1 in progress, 1 checked |
| 6 | `timecreated` | bigint(10) | NO |  |  |  |
| 7 | `timechecked` | bigint(10) | YES | `NULL` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `areaid` → `tool_brickfield_areas`(`id`)
- **Index**: `status`
- **Index**: `iscurrent`, `areaid`

### tool_brickfield_errors

*Errors during the accessibility checks*

<sub>defined in `public/admin/tool/brickfield/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `resultid` | bigint(10) | NO |  | MUL |  |
| 3 | `linenumber` | bigint(10) | NO | `0` |  |  |
| 4 | `errordata` | longtext | YES | `NULL` |  |  |
| 5 | `htmlcode` | longtext | YES | `NULL` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `resultid` → `tool_brickfield_results`(`id`)

### tool_brickfield_process

*Queued records to initiate new processing of specific targets*

<sub>defined in `public/admin/tool/brickfield/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `courseid` | bigint(10) | NO |  |  |  |
| 3 | `item` | varchar(64) | YES | `NULL` |  | The item for process action. |
| 4 | `contextid` | bigint(10) | YES | `NULL` |  |  |
| 5 | `innercontextid` | bigint(10) | YES | `NULL` |  |  |
| 6 | `timecreated` | bigint(16) | YES | `NULL` |  |  |
| 7 | `timecompleted` | bigint(16) | YES | `NULL` | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `timecompleted`

### tool_brickfield_results

*Results of the accessibility checks*

<sub>defined in `public/admin/tool/brickfield/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `contentid` | bigint(10) | YES | `NULL` | MUL |  |
| 3 | `checkid` | bigint(10) | NO |  | MUL |  |
| 4 | `errorcount` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `contentid` → `tool_brickfield_content`(`id`)
- **FK** `checkid` → `tool_brickfield_checks`(`id`)
- **Index**: `contentid`, `checkid`

### tool_brickfield_schedule

*Keeps the per course content analysis schedule.*

<sub>defined in `public/admin/tool/brickfield/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `contextlevel` | bigint(10) | NO | `50` | MUL | The context level for this item. Defaults to CONTEXT_COURSE. |
| 3 | `instanceid` | bigint(10) | NO |  |  | The id of the specific context instance. Course id for courses. |
| 4 | `contextid` | bigint(10) | YES | `NULL` |  | Id of the specific context record. |
| 5 | `status` | tinyint(2) | NO | `0` | MUL | The schedule status for this item. 0 = not requested; 1 = requested; 2 = analyzed. |
| 6 | `timeanalyzed` | bigint(10) | YES | `0` |  | The most recent time the item was analyzed by scheduler. |
| 7 | `timemodified` | bigint(10) | YES | `0` |  | Time stamp of the last record update. |

**Keys & indexes**

- **Primary key:** `id`
- **Index** (unique): `contextlevel`, `instanceid`
- **Index**: `status`

### tool_brickfield_summary

*Contains accessibility check results summary information.*

<sub>defined in `public/admin/tool/brickfield/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `courseid` | bigint(10) | NO |  | MUL |  |
| 3 | `status` | tinyint(1) | YES | `NULL` | MUL |  |
| 4 | `activities` | bigint(10) | YES | `NULL` |  |  |
| 5 | `activitiespassed` | bigint(10) | YES | `NULL` |  |  |
| 6 | `activitiesfailed` | bigint(10) | YES | `NULL` |  |  |
| 7 | `errorschecktype1` | bigint(10) | YES | `NULL` |  |  |
| 8 | `errorschecktype2` | bigint(10) | YES | `NULL` |  |  |
| 9 | `errorschecktype3` | bigint(10) | YES | `NULL` |  |  |
| 10 | `errorschecktype4` | bigint(10) | YES | `NULL` |  |  |
| 11 | `errorschecktype5` | bigint(10) | YES | `NULL` |  |  |
| 12 | `errorschecktype6` | bigint(10) | YES | `NULL` |  |  |
| 13 | `errorschecktype7` | bigint(10) | YES | `NULL` |  |  |
| 14 | `failedchecktype1` | bigint(10) | YES | `NULL` |  |  |
| 15 | `failedchecktype2` | bigint(10) | YES | `NULL` |  |  |
| 16 | `failedchecktype3` | bigint(10) | YES | `NULL` |  |  |
| 17 | `failedchecktype4` | bigint(10) | YES | `NULL` |  |  |
| 18 | `failedchecktype5` | bigint(10) | YES | `NULL` |  |  |
| 19 | `failedchecktype6` | bigint(10) | YES | `NULL` |  |  |
| 20 | `failedchecktype7` | bigint(10) | YES | `NULL` |  |  |
| 21 | `percentchecktype1` | bigint(10) | YES | `NULL` |  |  |
| 22 | `percentchecktype2` | bigint(10) | YES | `NULL` |  |  |
| 23 | `percentchecktype3` | bigint(10) | YES | `NULL` |  |  |
| 24 | `percentchecktype4` | bigint(10) | YES | `NULL` |  |  |
| 25 | `percentchecktype5` | bigint(10) | YES | `NULL` |  |  |
| 26 | `percentchecktype6` | bigint(10) | YES | `NULL` |  |  |
| 27 | `percentchecktype7` | bigint(10) | YES | `NULL` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `courseid` → `course`(`id`)
- **Index**: `status`

### tool_cohortroles

*Mapping of users to cohort role assignments.*

<sub>defined in `public/admin/tool/cohortroles/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `cohortid` | bigint(10) | NO |  | MUL | The cohort to sync |
| 3 | `roleid` | bigint(10) | NO |  |  | The role to assign |
| 4 | `userid` | bigint(10) | NO |  |  | The user to sync |
| 5 | `timecreated` | bigint(10) | NO |  |  | The time this record was created |
| 6 | `timemodified` | bigint(10) | NO |  |  | The time this record was modified. |
| 7 | `usermodified` | bigint(10) | YES | `NULL` |  | Who last modified this record? |

**Keys & indexes**

- **Primary key:** `id`
- **Index** (unique): `cohortid`, `roleid`, `userid`

### tool_customlang

*Contains the working checkout of all strings and their customization*

<sub>defined in `public/admin/tool/customlang/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `lang` | varchar(20) | NO | `''` | MUL | The code of the language this string belongs to. Like en, cs or es |
| 3 | `componentid` | bigint(10) | NO |  | MUL | The id of the component |
| 4 | `stringid` | varchar(255) | NO | `''` |  | The identifier of the string |
| 5 | `original` | longtext | NO |  |  | English original of the string |
| 6 | `master` | longtext | YES | `NULL` |  | Master translation of the string as is distributed in the official lang pack, null if not translated |
| 7 | `local` | longtext | YES | `NULL` |  | Local customization of the string, null if not customized |
| 8 | `timemodified` | bigint(10) | NO |  |  | The timestamp of when the original or master was recently modified |
| 9 | `timecustomized` | bigint(10) | YES | `NULL` |  | The timestamp of when the value of the local translation was recently modified, null if not customized yet |
| 10 | `outdated` | smallint(3) | YES | `0` |  | Either the English original or the master translation changed and the customization may be outdated |
| 11 | `modified` | smallint(3) | YES | `0` |  | Has the string been modified via the translator? |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `componentid` → `tool_customlang_components`(`id`)
- **Index** (unique): `lang`, `componentid`, `stringid`

### tool_customlang_components

*Contains the list of all installed plugins that provide their own language pack*

<sub>defined in `public/admin/tool/customlang/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `name` | varchar(255) | NO | `''` |  | The normalized name of the plugin |
| 3 | `version` | varchar(255) | YES | `NULL` |  | The checked out version of the plugin, null if the version is unknown |

**Keys & indexes**

- **Primary key:** `id`

### tool_dataprivacy_category

*Data categories*

<sub>defined in `public/admin/tool/dataprivacy/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `name` | varchar(100) | NO | `''` |  |  |
| 3 | `description` | longtext | YES | `NULL` |  |  |
| 4 | `descriptionformat` | tinyint(1) | YES | `NULL` |  |  |
| 5 | `usermodified` | bigint(10) | NO |  |  |  |
| 6 | `timecreated` | bigint(10) | NO |  |  |  |
| 7 | `timemodified` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`

### tool_dataprivacy_contextlist

*List of contexts for a component*

<sub>defined in `public/admin/tool/dataprivacy/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `component` | varchar(255) | NO | `''` |  | Frankenstyle component name |
| 3 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 4 | `timemodified` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`

### tool_dataprivacy_ctxexpired

*Default comment for the table, please edit me*

<sub>defined in `public/admin/tool/dataprivacy/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `contextid` | bigint(10) | NO |  | UNI |  |
| 3 | `unexpiredroles` | longtext | YES | `NULL` |  | Roles which have explicitly not expired yet. |
| 4 | `expiredroles` | longtext | YES | `NULL` |  | Explicitly expires roles |
| 5 | `defaultexpired` | tinyint(1) | NO |  |  | The default retention period has passed. |
| 6 | `status` | tinyint(2) | NO | `0` |  |  |
| 7 | `usermodified` | bigint(10) | NO |  |  |  |
| 8 | `timecreated` | bigint(10) | NO |  |  |  |
| 9 | `timemodified` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `contextid` → `context`(`id`) *(unique)*

### tool_dataprivacy_ctxinstance

*Default comment for the table, please edit me*

<sub>defined in `public/admin/tool/dataprivacy/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `contextid` | bigint(10) | NO |  | UNI |  |
| 3 | `purposeid` | bigint(10) | YES | `NULL` | MUL |  |
| 4 | `categoryid` | bigint(10) | YES | `NULL` | MUL |  |
| 5 | `usermodified` | bigint(10) | NO |  |  |  |
| 6 | `timecreated` | bigint(10) | NO |  |  |  |
| 7 | `timemodified` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `contextid` → `context`(`id`) *(unique)*
- **FK** `purposeid` → `tool_dataprivacy_purpose`(`id`)
- **FK** `categoryid` → `tool_dataprivacy_category`(`id`)

### tool_dataprivacy_ctxlevel

*Default comment for the table, please edit me*

<sub>defined in `public/admin/tool/dataprivacy/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `contextlevel` | smallint(3) | NO |  | UNI |  |
| 3 | `purposeid` | bigint(10) | YES | `NULL` | MUL |  |
| 4 | `categoryid` | bigint(10) | YES | `NULL` | MUL |  |
| 5 | `usermodified` | bigint(10) | NO |  |  |  |
| 6 | `timecreated` | bigint(10) | NO |  |  |  |
| 7 | `timemodified` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `categoryid` → `tool_dataprivacy_category`(`id`)
- **FK** `purposeid` → `tool_dataprivacy_purpose`(`id`)
- **Unique:** `contextlevel`

### tool_dataprivacy_ctxlst_ctx

*A contextlist context item*

<sub>defined in `public/admin/tool/dataprivacy/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `contextid` | bigint(10) | NO |  |  |  |
| 3 | `contextlistid` | bigint(10) | NO |  | MUL |  |
| 4 | `status` | tinyint(2) | NO | `0` |  | Approval status of the context item |
| 5 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 6 | `timemodified` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `contextlistid` → `tool_dataprivacy_contextlist`(`id`)

### tool_dataprivacy_purpose

*Data purposes*

<sub>defined in `public/admin/tool/dataprivacy/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `name` | varchar(100) | NO | `''` |  |  |
| 3 | `description` | longtext | YES | `NULL` |  |  |
| 4 | `descriptionformat` | tinyint(1) | YES | `NULL` |  |  |
| 5 | `lawfulbases` | longtext | NO |  |  | Comma-separated IDs matching records in tool_dataprivacy_lawfulbasis |
| 6 | `sensitivedatareasons` | longtext | YES | `NULL` |  | Comma-separated IDs matching records in tool_dataprivacy_sensitive |
| 7 | `retentionperiod` | varchar(255) | NO | `''` |  |  |
| 8 | `protected` | tinyint(1) | YES | `NULL` |  |  |
| 9 | `usermodified` | bigint(10) | NO |  |  |  |
| 10 | `timecreated` | bigint(10) | NO |  |  |  |
| 11 | `timemodified` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`

### tool_dataprivacy_purposerole

*Data purpose overrides for a specific role*

<sub>defined in `public/admin/tool/dataprivacy/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `purposeid` | bigint(10) | NO |  | MUL |  |
| 3 | `roleid` | bigint(10) | NO |  | MUL |  |
| 4 | `lawfulbases` | longtext | YES | `NULL` |  |  |
| 5 | `sensitivedatareasons` | longtext | YES | `NULL` |  |  |
| 6 | `retentionperiod` | varchar(255) | NO | `''` |  |  |
| 7 | `protected` | tinyint(1) | YES | `NULL` |  |  |
| 8 | `usermodified` | bigint(10) | NO |  | MUL |  |
| 9 | `timecreated` | bigint(10) | NO |  |  |  |
| 10 | `timemodified` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `purposeid` → `tool_dataprivacy_purpose`(`id`)
- **FK** `roleid` → `role`(`id`)
- **FK** `usermodified` → `user`(`id`)
- **Index** (unique): `purposeid`, `roleid`

### tool_dataprivacy_request

*Table for data requests*

<sub>defined in `public/admin/tool/dataprivacy/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `type` | bigint(10) | NO | `0` |  | Data request type |
| 3 | `comments` | longtext | YES | `NULL` |  | More details about the request |
| 4 | `commentsformat` | tinyint(2) | NO | `0` |  |  |
| 5 | `userid` | bigint(10) | NO | `0` | MUL | The user ID the request is being made for |
| 6 | `requestedby` | bigint(10) | NO | `0` | MUL | The user ID of the one making the request |
| 7 | `status` | tinyint(2) | NO | `0` |  | The current status of the data request |
| 8 | `dpo` | bigint(10) | YES | `0` | MUL | The user ID of the Data Protection Officer who is reviewing th request |
| 9 | `dpocomment` | longtext | YES | `NULL` |  | DPO's comments (e.g. reason for rejecting the request, etc.) |
| 10 | `dpocommentformat` | tinyint(2) | NO | `0` |  |  |
| 11 | `systemapproved` | smallint(4) | NO | `0` |  |  |
| 12 | `usermodified` | bigint(10) | NO | `0` | MUL | The user who created/modified this request object |
| 13 | `timecreated` | bigint(10) | NO | `0` |  | The time this data request was created |
| 14 | `timemodified` | bigint(10) | NO | `0` |  | The last time this data request was updated |
| 15 | `creationmethod` | bigint(10) | NO | `0` |  | The type of the creation method of the data request |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)
- **FK** `requestedby` → `user`(`id`)
- **FK** `dpo` → `user`(`id`)
- **FK** `usermodified` → `user`(`id`)

### tool_dataprivacy_rqst_ctxlst

*Association table joining requests and contextlists*

<sub>defined in `public/admin/tool/dataprivacy/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `requestid` | bigint(10) | NO |  | MUL |  |
| 3 | `contextlistid` | bigint(10) | NO |  | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `requestid` → `tool_dataprivacy_request`(`id`)
- **FK** `contextlistid` → `tool_dataprivacy_contextlist`(`id`)
- **Unique:** `requestid`, `contextlistid`

### tool_mfa

*Table to store factor configurations for users*

<sub>defined in `public/admin/tool/mfa/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO |  | MUL | User ID |
| 3 | `factor` | varchar(100) | NO | `''` | MUL | Factor type |
| 4 | `secret` | varchar(1333) | YES | `NULL` |  | Any secret data for factor |
| 5 | `label` | varchar(1333) | YES | `NULL` |  | label for factor instance, eg device or email. |
| 6 | `timecreated` | bigint(15) | YES | `NULL` |  | Time the factor instance was setup |
| 7 | `createdfromip` | varchar(100) | YES | `NULL` |  | IP that the factor was setup from |
| 8 | `timemodified` | bigint(15) | YES | `NULL` |  | Time factor was last modified. |
| 9 | `lastverified` | bigint(15) | YES | `NULL` |  | Time user was last verified with this factor. |
| 10 | `revoked` | tinyint(1) | NO | `0` |  |  |
| 11 | `lockcounter` | mediumint(5) | NO | `0` |  | Counter of failed attempts |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `userid`
- **Index**: `factor`
- **Index**: `userid`, `factor`, `lockcounter`

### tool_mfa_auth

*Stores the last time a successful MFA auth was registered for a userid*

<sub>defined in `public/admin/tool/mfa/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO |  | MUL | User id |
| 3 | `lastverified` | bigint(15) | NO | `0` |  | Timestamp of last MFA verification. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)

### tool_mfa_secrets

*Table to store factor secrets*

<sub>defined in `public/admin/tool/mfa/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO |  | MUL |  |
| 3 | `factor` | varchar(100) | NO | `''` | MUL |  |
| 4 | `secret` | varchar(1333) | NO | `''` |  |  |
| 5 | `timecreated` | bigint(15) | NO |  |  |  |
| 6 | `expiry` | bigint(15) | NO |  | MUL |  |
| 7 | `revoked` | tinyint(1) | NO | `0` |  |  |
| 8 | `sessionid` | varchar(100) | YES | `NULL` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)
- **Index**: `factor`
- **Index**: `expiry`

### tool_monitor_events

*A table that keeps a log of events related to subscriptions*

<sub>defined in `public/admin/tool/monitor/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `eventname` | varchar(254) | NO | `''` |  | Event name |
| 3 | `contextid` | bigint(10) | NO |  | MUL | Context id |
| 4 | `contextlevel` | bigint(10) | NO |  |  | Context level |
| 5 | `contextinstanceid` | bigint(10) | NO |  | MUL | Context instance id |
| 6 | `link` | varchar(254) | NO | `''` |  | Link to the event location |
| 7 | `courseid` | bigint(10) | NO |  | MUL | course id |
| 8 | `timecreated` | bigint(10) | NO |  |  | Time created |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `courseid` → `course`(`id`)
- **FK** `contextid` → `context`(`id`)
- **FK** `contextinstanceid` → `context`(`instanceid`)

### tool_monitor_history

*Table to store history of message notifications sent*

<sub>defined in `public/admin/tool/monitor/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `sid` | bigint(10) | NO |  | MUL | Subscription id |
| 3 | `userid` | bigint(10) | NO |  |  | User to whom this notification was sent |
| 4 | `timesent` | bigint(10) | NO |  |  | Timestamp of when the message was sent. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `sid` → `tool_monitor_subscriptions`(`id`)
- **Index** (unique): `sid`, `userid`, `timesent`

### tool_monitor_rules

*Table to store rules*

<sub>defined in `public/admin/tool/monitor/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `description` | longtext | YES | `NULL` |  | Description of the rule |
| 3 | `descriptionformat` | tinyint(1) | NO |  |  | Description format |
| 4 | `name` | varchar(254) | NO | `''` |  | Name of the rule |
| 5 | `userid` | bigint(10) | NO |  |  | Id of user who created the rule |
| 6 | `courseid` | bigint(10) | NO |  | MUL | Id of course to which this rule belongs. |
| 7 | `plugin` | varchar(254) | NO | `''` |  | Frankenstlye name of the plguin |
| 8 | `eventname` | varchar(254) | NO | `''` | MUL | Fully qualified name of the event |
| 9 | `template` | longtext | NO |  |  | Message template |
| 10 | `templateformat` | tinyint(1) | NO |  |  | Template format |
| 11 | `frequency` | smallint(4) | NO |  |  | Frequency |
| 12 | `timewindow` | mediumint(5) | NO |  |  | Time window in seconds |
| 13 | `timemodified` | bigint(10) | NO |  |  | Timestamp when this rule was last modified |
| 14 | `timecreated` | bigint(10) | NO |  |  | Time stamp of when this rule was created |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `courseid`, `userid`
- **Index**: `eventname`

### tool_monitor_subscriptions

*Table to store user subscriptions to various rules*

<sub>defined in `public/admin/tool/monitor/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `courseid` | bigint(10) | NO |  | MUL | Course id of the subscription |
| 3 | `ruleid` | bigint(10) | NO |  | MUL | Rule id |
| 4 | `cmid` | bigint(10) | NO |  |  | Course module id |
| 5 | `userid` | bigint(10) | NO |  |  | User id of the subscriber |
| 6 | `timecreated` | bigint(10) | NO |  |  | Timestamp of when this subscription was created |
| 7 | `lastnotificationsent` | bigint(10) | NO | `0` |  | Timestamp of the time when a notification was last sent for this subscription. |
| 8 | `inactivedate` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `ruleid` → `tool_monitor_rules`(`id`)
- **Index**: `courseid`, `userid`

### tool_policy

*Contains the list of policy documents defined on the site.*

<sub>defined in `public/admin/tool/policy/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `sortorder` | mediumint(5) | NO | `999` |  | Defines the order in which policies should be presented to users |
| 3 | `currentversionid` | bigint(10) | YES | `NULL` | MUL | ID of the current policy version that applies on the site, NULL if the policy does not apply |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `currentversionid` → `tool_policy_versions`(`id`)

### tool_policy_acceptances

*Tracks users accepting the policy versions*

<sub>defined in `public/admin/tool/policy/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `policyversionid` | bigint(10) | NO |  | MUL | ID of the policy document version |
| 3 | `userid` | bigint(10) | NO |  | MUL | ID of the user this acceptance is relevant to |
| 4 | `status` | tinyint(1) | YES | `NULL` |  | Acceptance status: 1 - accepted, 0 - not accepted |
| 5 | `lang` | varchar(30) | NO | `''` |  | Code of the language the user had when the policy document was displayed |
| 6 | `usermodified` | bigint(10) | NO |  | MUL | ID of the user who last modified the acceptance record |
| 7 | `timecreated` | bigint(10) | NO |  |  | Timestamp of when the acceptance record was created |
| 8 | `timemodified` | bigint(10) | NO |  |  | Timestamp of when the acceptance record was last modified |
| 9 | `note` | longtext | YES | `NULL` |  | Plain text note describing how the actual consent has been obtained if the policy has been accepted on other user's behalf. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `policyversionid` → `tool_policy_versions`(`id`)
- **FK** `userid` → `user`(`id`)
- **FK** `usermodified` → `user`(`id`)
- **Unique:** `policyversionid`, `userid`

### tool_policy_versions

*Holds versions of the policy documents*

<sub>defined in `public/admin/tool/policy/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `name` | varchar(1333) | NO | `''` |  | Name of the policy document |
| 3 | `type` | smallint(3) | NO | `0` |  | Type of the policy: 0 - Site policy, 1 - Privacy policy, 2 - Third party policy, 99 - Other |
| 4 | `audience` | smallint(3) | NO | `0` |  | Who is this policy targeted at: 0 - all users, 1 - logged in users only, 2 - guests only |
| 5 | `archived` | smallint(3) | NO | `0` |  | Should the version be considered as archived. All non-archived, non-current versions are considered to be drafts. |
| 6 | `usermodified` | bigint(10) | NO |  | MUL | ID of the user who last edited this policy document version. |
| 7 | `timecreated` | bigint(10) | NO |  |  | Timestamp of when the policy version was created. |
| 8 | `timemodified` | bigint(10) | NO |  |  | Timestamp of when the policy version was last modified. |
| 9 | `policyid` | bigint(10) | NO |  | MUL | ID of the policy document we are version of. |
| 10 | `agreementstyle` | smallint(3) | NO | `0` |  | How this agreement should flow: 0 - on the consent page, 1 - on a separate page before reaching the consent page. |
| 11 | `optional` | smallint(3) | NO | `0` |  | 0 - the policy must be accepted to use the site, 1 - accepting the policy is optional |
| 12 | `revision` | varchar(1333) | NO | `''` |  | Human readable version of the policy document |
| 13 | `summary` | longtext | NO |  |  | Policy text summary |
| 14 | `summaryformat` | smallint(3) | NO |  |  | Format of the summary field |
| 15 | `content` | longtext | NO |  |  | Full policy text |
| 16 | `contentformat` | smallint(3) | NO |  |  | Format of the content field |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `usermodified` → `user`(`id`)
- **FK** `policyid` → `tool_policy`(`id`)

### tool_recyclebin_category

*A list of items in the category recycle bin*

<sub>defined in `public/admin/tool/recyclebin/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `categoryid` | bigint(10) | NO |  | MUL |  |
| 3 | `shortname` | varchar(1333) | NO | `''` |  |  |
| 4 | `fullname` | varchar(1333) | NO | `''` |  |  |
| 5 | `timecreated` | bigint(10) | NO |  | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `categoryid` → `course_categories`(`id`)
- **Index**: `timecreated`

### tool_recyclebin_course

*A list of items in the course recycle bin*

<sub>defined in `public/admin/tool/recyclebin/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `courseid` | bigint(10) | NO |  | MUL |  |
| 3 | `section` | bigint(10) | NO |  |  |  |
| 4 | `module` | bigint(10) | NO |  |  |  |
| 5 | `name` | varchar(1333) | YES | `NULL` |  |  |
| 6 | `timecreated` | bigint(10) | NO | `0` | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `courseid` → `course`(`id`)
- **Index**: `timecreated`

### tool_usertours_steps

*Steps in an tour*

<sub>defined in `public/admin/tool/usertours/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `tourid` | bigint(10) | NO |  | MUL |  |
| 3 | `title` | longtext | YES | `NULL` |  | Title of the step |
| 4 | `content` | longtext | YES | `NULL` |  | Content of the user tour - allow for multilang tags |
| 5 | `contentformat` | smallint(4) | NO | `0` |  |  |
| 6 | `targettype` | tinyint(2) | NO |  |  | Type of the target (e.g. block, CSS selector, etc.) |
| 7 | `targetvalue` | longtext | NO |  |  | The value for the specified target type. |
| 8 | `sortorder` | bigint(10) | NO | `0` |  |  |
| 9 | `configdata` | longtext | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `tourid` → `tool_usertours_tours`(`id`)
- **Index**: `tourid`, `sortorder`

### tool_usertours_tours

*List of tours*

<sub>defined in `public/admin/tool/usertours/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `name` | varchar(255) | NO | `''` |  | Name of the user tour |
| 3 | `description` | longtext | YES | `NULL` |  |  |
| 4 | `pathmatch` | varchar(255) | YES | `NULL` |  |  |
| 5 | `enabled` | tinyint(1) | NO | `0` |  |  |
| 6 | `sortorder` | bigint(10) | NO | `0` |  |  |
| 7 | `endtourlabel` | varchar(255) | YES | `NULL` |  | Custom label for the end tour button |
| 8 | `configdata` | longtext | NO |  |  |  |
| 9 | `displaystepnumbers` | tinyint(1) | NO | `0` |  | Setting to display step numbers of the tour |

**Keys & indexes**

- **Primary key:** `id`

### upgrade_log

*Upgrade logging*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `type` | bigint(10) | NO |  | MUL | type: 0==info, 1==notice, 2==error |
| 3 | `plugin` | varchar(100) | YES | `NULL` |  |  |
| 4 | `version` | varchar(100) | YES | `NULL` |  | plugin or main version if known |
| 5 | `targetversion` | varchar(100) | YES | `NULL` |  | version of plugin or core specified in version.php at the time of upgrade loggging |
| 6 | `info` | varchar(255) | NO | `''` |  |  |
| 7 | `details` | longtext | YES | `NULL` |  |  |
| 8 | `backtrace` | longtext | YES | `NULL` |  |  |
| 9 | `userid` | bigint(10) | NO |  | MUL |  |
| 10 | `timemodified` | bigint(10) | NO |  | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)
- **Index**: `timemodified`
- **Index**: `type`, `timemodified`

### url

*each record is one url resource*

<sub>defined in `public/mod/url/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `course` | bigint(10) | NO | `0` | MUL |  |
| 3 | `name` | varchar(1333) | NO | `''` |  |  |
| 4 | `intro` | longtext | YES | `NULL` |  |  |
| 5 | `introformat` | smallint(4) | NO | `0` |  |  |
| 6 | `externalurl` | longtext | NO |  |  |  |
| 7 | `display` | smallint(4) | NO | `0` |  |  |
| 8 | `displayoptions` | longtext | YES | `NULL` |  |  |
| 9 | `parameters` | longtext | YES | `NULL` |  |  |
| 10 | `timemodified` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `course`

### user

*One record for each person*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `auth` | varchar(20) | NO | `'manual'` | MUL |  |
| 3 | `confirmed` | tinyint(1) | NO | `0` | MUL |  |
| 4 | `policyagreed` | tinyint(1) | NO | `0` |  |  |
| 5 | `deleted` | tinyint(1) | NO | `0` | MUL |  |
| 6 | `suspended` | tinyint(1) | NO | `0` |  | suspended flag prevents users to log in |
| 7 | `mnethostid` | bigint(10) | NO | `0` | MUL |  |
| 8 | `username` | varchar(100) | NO | `''` |  |  |
| 9 | `password` | varchar(255) | NO | `''` |  |  |
| 10 | `idnumber` | varchar(255) | NO | `''` | MUL |  |
| 11 | `firstname` | varchar(100) | NO | `''` | MUL |  |
| 12 | `lastname` | varchar(100) | NO | `''` | MUL |  |
| 13 | `email` | varchar(100) | NO | `''` | MUL |  |
| 14 | `emailstop` | tinyint(1) | NO | `0` |  |  |
| 15 | `phone1` | varchar(20) | NO | `''` |  |  |
| 16 | `phone2` | varchar(20) | NO | `''` |  |  |
| 17 | `institution` | varchar(255) | NO | `''` |  |  |
| 18 | `department` | varchar(255) | NO | `''` |  |  |
| 19 | `address` | varchar(255) | NO | `''` |  |  |
| 20 | `city` | varchar(120) | NO | `''` | MUL |  |
| 21 | `country` | varchar(2) | NO | `''` | MUL |  |
| 22 | `lang` | varchar(30) | NO | `'en'` |  |  |
| 23 | `calendartype` | varchar(30) | NO | `'gregorian'` |  |  |
| 24 | `theme` | varchar(50) | NO | `''` |  |  |
| 25 | `timezone` | varchar(100) | NO | `'99'` |  |  |
| 26 | `firstaccess` | bigint(10) | NO | `0` |  |  |
| 27 | `lastaccess` | bigint(10) | NO | `0` | MUL |  |
| 28 | `lastlogin` | bigint(10) | NO | `0` |  |  |
| 29 | `currentlogin` | bigint(10) | NO | `0` |  |  |
| 30 | `lastip` | varchar(45) | NO | `''` |  |  |
| 31 | `secret` | varchar(15) | NO | `''` |  |  |
| 32 | `picture` | bigint(10) | NO | `0` |  | 0 means no image uploaded, positive values are revisions thta prevent caching problems, negative values are reserved for future use |
| 33 | `description` | longtext | YES | `NULL` |  |  |
| 34 | `descriptionformat` | tinyint(2) | NO | `1` |  |  |
| 35 | `mailformat` | tinyint(1) | NO | `1` |  |  |
| 36 | `maildigest` | tinyint(1) | NO | `0` |  |  |
| 37 | `maildisplay` | tinyint(2) | NO | `2` |  |  |
| 38 | `autosubscribe` | tinyint(1) | NO | `1` |  |  |
| 39 | `trackforums` | tinyint(1) | NO | `0` |  |  |
| 40 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 41 | `timemodified` | bigint(10) | NO | `0` |  |  |
| 42 | `trustbitmask` | bigint(10) | NO | `0` |  |  |
| 43 | `imagealt` | varchar(255) | YES | `NULL` |  | alt tag for user uploaded image |
| 44 | `lastnamephonetic` | varchar(255) | YES | `NULL` | MUL | Last name phonetic |
| 45 | `firstnamephonetic` | varchar(255) | YES | `NULL` | MUL | First name phonetic |
| 46 | `middlename` | varchar(255) | YES | `NULL` | MUL | Middle name |
| 47 | `alternatename` | varchar(255) | YES | `NULL` | MUL | Alternate name - Useful for three-name countries. |

**Keys & indexes**

- **Primary key:** `id`
- **Index** (unique): `mnethostid`, `username`
- **Index**: `deleted`
- **Index**: `confirmed`
- **Index**: `firstname`
- **Index**: `lastname`
- **Index**: `city`
- **Index**: `country`
- **Index**: `lastaccess`
- **Index**: `email`
- **Index**: `auth`
- **Index**: `idnumber`
- **Index**: `firstnamephonetic`
- **Index**: `lastnamephonetic`
- **Index**: `middlename`
- **Index**: `alternatename`

### user_devices

*This table stores user's mobile devices information in order to send PUSH notifications*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `appid` | varchar(128) | NO | `''` |  | the app id, usually something like com.moodle.moodlemobile |
| 4 | `name` | varchar(32) | NO | `''` |  | the device name, occam or iPhone etc.. |
| 5 | `model` | varchar(32) | NO | `''` |  | the device model, Nexus 4 or iPad 1,1 |
| 6 | `platform` | varchar(32) | NO | `''` |  | the device platform, Android or iOS etc |
| 7 | `version` | varchar(32) | NO | `''` |  | The device version, 6.1.2, 4.2.2 etc.. |
| 8 | `pushid` | varchar(255) | NO | `''` | MUL | the device PUSH token/key/identifier/registration id |
| 9 | `uuid` | varchar(255) | NO | `''` | MUL | The device vendor UUID |
| 10 | `publickey` | longtext | YES | `NULL` |  | The app generated public key |
| 11 | `timecreated` | bigint(10) | NO |  |  |  |
| 12 | `timemodified` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)
- **Unique:** `pushid`, `userid`
- **Index**: `uuid`, `userid`

### user_enrolments

*Users participating in courses (aka enrolled users) - everybody who is participating/visible in course, that means both teachers and students*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `status` | bigint(10) | NO | `0` |  | 0..9 are system constants, 0 means active participation, see ENROL_PARTICIPATION_* constants, plugins may define own status greater than 10 |
| 3 | `enrolid` | bigint(10) | NO |  | MUL |  |
| 4 | `userid` | bigint(10) | NO |  | MUL |  |
| 5 | `timestart` | bigint(10) | NO | `0` |  |  |
| 6 | `timeend` | bigint(10) | NO | `2147483647` |  |  |
| 7 | `modifierid` | bigint(10) | NO | `0` | MUL |  |
| 8 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 9 | `timemodified` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `enrolid` → `enrol`(`id`)
- **FK** `userid` → `user`(`id`)
- **FK** `modifierid` → `user`(`id`)
- **Index** (unique): `enrolid`, `userid`

### user_info_category

*Customisable fields categories*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `name` | varchar(255) | NO | `''` |  | Category name |
| 3 | `sortorder` | bigint(10) | NO | `0` |  | Display order |

**Keys & indexes**

- **Primary key:** `id`

### user_info_data

*Data for the customisable user fields*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO | `0` | MUL | id from the user table |
| 3 | `fieldid` | bigint(10) | NO | `0` |  | id from the field table |
| 4 | `data` | longtext | NO |  |  | Field data |
| 5 | `dataformat` | tinyint(2) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index** (unique): `userid`, `fieldid`

### user_info_field

*Customisable user profile fields*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `shortname` | varchar(255) | NO | `'shortname'` |  | short name for each field |
| 3 | `name` | longtext | NO |  |  | field name |
| 4 | `datatype` | varchar(255) | NO | `''` |  | Type of data held in this field |
| 5 | `description` | longtext | YES | `NULL` |  | Description of field |
| 6 | `descriptionformat` | tinyint(2) | NO | `0` |  |  |
| 7 | `categoryid` | bigint(10) | NO | `0` |  | id from category table |
| 8 | `sortorder` | bigint(10) | NO | `0` |  | order within the category |
| 9 | `required` | tinyint(2) | NO | `0` |  | Field required |
| 10 | `locked` | tinyint(2) | NO | `0` |  | Field locked |
| 11 | `visible` | smallint(4) | NO | `0` |  | Visibility: private, public, hidden |
| 12 | `forceunique` | tinyint(2) | NO | `0` |  | should the field contain unique data |
| 13 | `signup` | tinyint(2) | NO | `0` |  | display field on signup page |
| 14 | `defaultdata` | longtext | YES | `NULL` |  | Default value for this field |
| 15 | `defaultdataformat` | tinyint(2) | NO | `0` |  |  |
| 16 | `param1` | longtext | YES | `NULL` |  | General parameter field |
| 17 | `param2` | longtext | YES | `NULL` |  | General parameter field |
| 18 | `param3` | longtext | YES | `NULL` |  | General parameter field |
| 19 | `param4` | longtext | YES | `NULL` |  | General parameter field |
| 20 | `param5` | longtext | YES | `NULL` |  | General parameter field |

**Keys & indexes**

- **Primary key:** `id`

### user_lastaccess

*To keep track of course page access times, used in online participants block, and participants list*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `courseid` | bigint(10) | NO | `0` | MUL |  |
| 4 | `timeaccess` | bigint(10) | NO | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index** (unique): `userid`, `courseid`
- **Index**: `userid`
- **Index**: `courseid`

### user_password_history

*A rotating log of hashes of previously used passwords for each user.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO |  | MUL |  |
| 3 | `hash` | varchar(255) | NO | `''` |  |  |
| 4 | `timecreated` | bigint(10) | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)

### user_password_resets

*table tracking password reset confirmation tokens*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO |  | MUL | id of the user account which requester claimed to be |
| 3 | `timerequested` | bigint(10) | NO |  |  | The time that the user first requested this password reset |
| 4 | `timererequested` | bigint(10) | NO | `0` |  | The time the user re-requested the password reset. |
| 5 | `token` | varchar(32) | NO | `''` |  | secret set and emailed to user |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)

### user_preferences

*Allows modules to store arbitrary user preferences*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `userid` | bigint(10) | NO | `0` | MUL |  |
| 3 | `name` | varchar(255) | NO | `''` | MUL |  |
| 4 | `value` | longtext | NO |  |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index** (unique): `userid`, `name`
- **Index**: `name`

### user_private_key

*access keys used in cookieless scripts - rss, etc.*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `script` | varchar(128) | NO | `''` | MUL | plugin, module - unique identifier |
| 3 | `value` | varchar(128) | NO | `''` |  | private access key value |
| 4 | `userid` | bigint(10) | NO |  | MUL | owner |
| 5 | `instance` | bigint(10) | YES | `NULL` |  | optional instance id |
| 6 | `iprestriction` | varchar(255) | YES | `NULL` |  | ip restriction |
| 7 | `validuntil` | bigint(10) | YES | `NULL` |  | timestampt - valid until data |
| 8 | `timecreated` | bigint(10) | YES | `NULL` |  | created timestamp |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `userid` → `user`(`id`)
- **Index**: `script`, `value`

### wiki

*Stores Wiki activity configuration*

<sub>defined in `public/mod/wiki/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `course` | bigint(10) | NO | `0` | MUL | Course wiki activity belongs to |
| 3 | `name` | varchar(1333) | NO | `'Wiki'` |  | name field for moodle instances |
| 4 | `intro` | longtext | YES | `NULL` |  | General introduction of the wiki activity |
| 5 | `introformat` | smallint(4) | NO | `0` |  | Format of the intro field (MOODLE, HTML, MARKDOWN...) |
| 6 | `timecreated` | bigint(10) | NO | `0` |  |  |
| 7 | `timemodified` | bigint(10) | NO | `0` |  |  |
| 8 | `firstpagetitle` | varchar(255) | NO | `'First Page'` |  | Wiki first page's name |
| 9 | `wikimode` | varchar(20) | NO | `'collaborative'` |  | Wiki mode (individual, collaborative) |
| 10 | `defaultformat` | varchar(20) | NO | `'creole'` |  | Wiki's default editor |
| 11 | `forceformat` | tinyint(1) | NO | `1` |  | Forces the default editor |
| 12 | `editbegin` | bigint(10) | NO | `0` |  | editbegin |
| 13 | `editend` | bigint(10) | YES | `0` |  | editend |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `course`

### wiki_links

*Page wiki links*

<sub>defined in `public/mod/wiki/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `subwikiid` | bigint(10) | NO | `0` | MUL | Subwiki instance |
| 3 | `frompageid` | bigint(10) | NO | `0` | MUL | Page id with a link |
| 4 | `topageid` | bigint(10) | NO | `0` |  | Page id that recives a link |
| 5 | `tomissingpage` | varchar(255) | YES | `NULL` |  | link to a nonexistent page |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `frompageid` → `wiki_pages`(`id`)
- **FK** `subwikiid` → `wiki_subwikis`(`id`)

### wiki_locks

*Manages page locks*

<sub>defined in `public/mod/wiki/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `pageid` | bigint(10) | NO | `0` |  | Locked page |
| 3 | `sectionname` | varchar(255) | YES | `NULL` |  | locked page section |
| 4 | `userid` | bigint(10) | NO | `0` |  | Locking user |
| 5 | `lockedat` | bigint(10) | NO | `0` |  | timestamp |

**Keys & indexes**

- **Primary key:** `id`

### wiki_pages

*Stores wiki pages*

<sub>defined in `public/mod/wiki/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `subwikiid` | bigint(10) | NO | `0` | MUL | Subwiki instance of this page |
| 3 | `title` | varchar(255) | NO | `'title'` |  | Page name |
| 4 | `cachedcontent` | longtext | NO |  |  | Cache wiki content |
| 5 | `timecreated` | bigint(10) | NO | `0` |  | Wiki page creation timestamp |
| 6 | `timemodified` | bigint(10) | NO | `0` |  | page edition timestamp |
| 7 | `timerendered` | bigint(10) | NO | `0` |  | Last render timestamp |
| 8 | `userid` | bigint(10) | NO | `0` |  | Edition author |
| 9 | `pageviews` | bigint(10) | NO | `0` |  | Number of page views |
| 10 | `readonly` | tinyint(1) | NO | `0` |  | Read only flag |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `subwikiid` → `wiki_subwikis`(`id`)
- **Unique:** `subwikiid`, `title`, `userid`

### wiki_subwikis

*Stores subwiki instances*

<sub>defined in `public/mod/wiki/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `wikiid` | bigint(10) | NO | `0` | MUL | Wiki activity |
| 3 | `groupid` | bigint(10) | NO | `0` |  | Group that owns this wiki |
| 4 | `userid` | bigint(10) | NO | `0` |  | Owner of that subwiki |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `wikiid` → `wiki`(`id`)
- **Unique:** `wikiid`, `groupid`, `userid`

### wiki_synonyms

*Stores wiki pages synonyms*

<sub>defined in `public/mod/wiki/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `subwikiid` | bigint(10) | NO | `0` |  | Subwiki instance |
| 3 | `pageid` | bigint(10) | NO | `0` | MUL | Original page |
| 4 | `pagesynonym` | varchar(255) | NO | `'Pagesynonym'` |  | Page name synonym |

**Keys & indexes**

- **Primary key:** `id`
- **Unique:** `pageid`, `pagesynonym`

### wiki_versions

*Stores wiki page history*

<sub>defined in `public/mod/wiki/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `pageid` | bigint(10) | NO | `0` | MUL | Page id |
| 3 | `content` | longtext | NO |  |  | Not parsed wiki content |
| 4 | `contentformat` | varchar(20) | NO | `'creole'` |  | Markup used to write content |
| 5 | `version` | mediumint(5) | NO | `0` |  | Wiki page version |
| 6 | `timecreated` | bigint(10) | NO | `0` |  | Page edition timestamp |
| 7 | `userid` | bigint(10) | NO | `0` |  | Edition autor |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `pageid` → `wiki_pages`(`id`)

### workshop

*This table keeps information about the module instances and their settings*

<sub>defined in `public/mod/workshop/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `course` | bigint(10) | NO |  | MUL | ID of the parent course |
| 3 | `name` | varchar(1333) | NO | `''` |  | Name of the activity |
| 4 | `intro` | longtext | YES | `NULL` |  | The introduction or description of the activity |
| 5 | `introformat` | smallint(3) | NO | `0` |  | The format of the intro field |
| 6 | `instructauthors` | longtext | YES | `NULL` |  | Instructions for the submission phase |
| 7 | `instructauthorsformat` | smallint(3) | NO | `0` |  |  |
| 8 | `instructreviewers` | longtext | YES | `NULL` |  | Instructions for the assessment phase |
| 9 | `instructreviewersformat` | smallint(3) | NO | `0` |  |  |
| 10 | `timemodified` | bigint(10) | NO |  |  | The timestamp when the module was modified |
| 11 | `phase` | smallint(3) | YES | `0` |  | The current phase of workshop (0 = not available, 1 = submission, 2 = assessment, 3 = closed) |
| 12 | `useexamples` | tinyint(2) | YES | `0` |  | optional feature: students practise evaluating on example submissions from teacher |
| 13 | `usepeerassessment` | tinyint(2) | YES | `0` |  | optional feature: students perform peer assessment of others' work |
| 14 | `useselfassessment` | tinyint(2) | YES | `0` |  | optional feature: students perform self assessment of their own work |
| 15 | `grade` | decimal(10,5) | YES | `80.00000` |  | The maximum grade for submission |
| 16 | `gradinggrade` | decimal(10,5) | YES | `20.00000` |  | The maximum grade for assessment |
| 17 | `strategy` | varchar(30) | NO | `''` |  | The type of the current grading strategy used in this workshop |
| 18 | `evaluation` | varchar(30) | NO | `''` |  | The recently used grading evaluation method |
| 19 | `gradedecimals` | smallint(3) | YES | `0` |  | Number of digits that should be shown after the decimal point when displaying grades |
| 20 | `submissiontypetext` | tinyint(1) | NO | `1` |  | Can students enter text for their submissions? 0 for no, 1 for optional, 2 for required. |
| 21 | `submissiontypefile` | tinyint(1) | NO | `1` |  | Can students attach files for their submissions? 0 for no, 1 for optional, 2 for required. |
| 22 | `nattachments` | smallint(3) | YES | `1` |  | Maximum number of submission attachments |
| 23 | `submissionfiletypes` | varchar(255) | YES | `NULL` |  | comma separated list of file extensions |
| 24 | `latesubmissions` | tinyint(2) | YES | `0` |  | Allow submitting the work after the deadline |
| 25 | `maxbytes` | bigint(10) | YES | `100000` |  | Maximum size of the one attached file |
| 26 | `examplesmode` | smallint(3) | YES | `0` |  | 0 = example assessments are voluntary, 1 = examples must be assessed before submission, 2 = examples are available after own submission and must be assessed before peer/self assessment phase |
| 27 | `submissionstart` | bigint(10) | YES | `0` |  | 0 = will be started manually, greater than 0 the timestamp of the start of the submission phase |
| 28 | `submissionend` | bigint(10) | YES | `0` |  | 0 = will be closed manually, greater than 0 the timestamp of the end of the submission phase |
| 29 | `assessmentstart` | bigint(10) | YES | `0` |  | 0 = will be started manually, greater than 0 the timestamp of the start of the assessment phase |
| 30 | `assessmentend` | bigint(10) | YES | `0` |  | 0 = will be closed manually, greater than 0 the timestamp of the end of the assessment phase |
| 31 | `phaseswitchassessment` | tinyint(2) | NO | `0` |  | Automatically switch to the assessment phase after the submissions deadline |
| 32 | `conclusion` | longtext | YES | `NULL` |  | A text to be displayed at the end of the workshop. |
| 33 | `conclusionformat` | smallint(3) | NO | `1` |  | The format of the conclusion field content. |
| 34 | `overallfeedbackmode` | smallint(3) | YES | `1` |  | Mode of the overall feedback support. |
| 35 | `overallfeedbackfiles` | smallint(3) | YES | `0` |  | Number of allowed attachments to the overall feedback. |
| 36 | `overallfeedbackfiletypes` | varchar(255) | YES | `NULL` |  | comma separated list of file extensions |
| 37 | `overallfeedbackmaxbytes` | bigint(10) | YES | `100000` |  | Maximum size of one file attached to the overall feedback. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `course` → `course`(`id`)

### workshop_aggregations

*Aggregated grades for assessment are stored here. The aggregated grade for submission is stored in workshop_submissions*

<sub>defined in `public/mod/workshop/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `workshopid` | bigint(10) | NO |  | MUL | the id of the workshop instance |
| 3 | `userid` | bigint(10) | NO |  | MUL | The id of the user which aggregated grades are calculated for |
| 4 | `gradinggrade` | decimal(10,5) | YES | `NULL` |  | The aggregated grade for all assessments made by this reviewer. The grade is a number from interval 0..100. If NULL then the grade for assessments has not been aggregated yet. |
| 5 | `timegraded` | bigint(10) | YES | `NULL` |  | The timestamp of when the participant's gradinggrade was recently aggregated. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `workshopid` → `workshop`(`id`)
- **FK** `userid` → `user`(`id`)
- **Unique:** `workshopid`, `userid`

### workshop_assessments

*Info about the made assessment and automatically calculated grade for it. The proposed grade can be overridden by teacher.*

<sub>defined in `public/mod/workshop/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `submissionid` | bigint(10) | NO |  | MUL | The id of the assessed submission |
| 3 | `reviewerid` | bigint(10) | NO |  | MUL | The id of the reviewer who makes this assessment |
| 4 | `weight` | bigint(10) | NO | `1` |  | The weight of the assessment for the purposes of aggregation |
| 5 | `timecreated` | bigint(10) | YES | `0` |  | If 0 then the assessment was allocated but the reviewer has not assessed yet. If greater than 0 then the timestamp of when the reviewer assessed for the first time |
| 6 | `timemodified` | bigint(10) | YES | `0` |  | If 0 then the assessment was allocated but the reviewer has not assessed yet. If greater than 0 then the timestamp of when the reviewer assessed for the last time |
| 7 | `grade` | decimal(10,5) | YES | `NULL` |  | The aggregated grade for submission suggested by the reviewer. The grade 0..100 is computed from the values assigned to the assessment dimensions fields. If NULL then it has not been aggregated yet. |
| 8 | `gradinggrade` | decimal(10,5) | YES | `NULL` |  | The computed grade 0..100 for this assessment. If NULL then it has not been computed yet. |
| 9 | `gradinggradeover` | decimal(10,5) | YES | `NULL` |  | Grade for the assessment manually overridden by a teacher. Grade is always from interval 0..100. If NULL then the grade is not overriden. |
| 10 | `gradinggradeoverby` | bigint(10) | YES | `NULL` | MUL | The id of the user who has overridden the grade for submission. |
| 11 | `feedbackauthor` | longtext | YES | `NULL` |  | The comment/feedback from the reviewer for the author. |
| 12 | `feedbackauthorformat` | smallint(3) | YES | `0` |  |  |
| 13 | `feedbackauthorattachment` | smallint(3) | YES | `0` |  | Are there some files attached to the feedbackauthor field? Sets to 1 by file_postupdate_standard_filemanager(). |
| 14 | `feedbackreviewer` | longtext | YES | `NULL` |  | The comment/feedback from the teacher for the reviewer. For example the reason why the grade for assessment was overridden |
| 15 | `feedbackreviewerformat` | smallint(3) | YES | `0` |  |  |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `submissionid` → `workshop_submissions`(`id`)
- **FK** `gradinggradeoverby` → `user`(`id`)
- **FK** `reviewerid` → `user`(`id`)

### workshop_grades

*How the reviewers filled-up the grading forms, given grades and comments*

<sub>defined in `public/mod/workshop/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `assessmentid` | bigint(10) | NO |  | MUL | Part of which assessment this grade is of |
| 3 | `strategy` | varchar(30) | NO | `''` |  |  |
| 4 | `dimensionid` | bigint(10) | NO |  |  | Foreign key. References dimension id in one of the grading strategy tables. |
| 5 | `grade` | decimal(10,5) | YES | `NULL` |  | Given grade in the referenced assessment dimension. |
| 6 | `peercomment` | longtext | YES | `NULL` |  | Reviewer's comment to the grade value. |
| 7 | `peercommentformat` | smallint(3) | YES | `0` |  | The format of peercomment field |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `assessmentid` → `workshop_assessments`(`id`)
- **Unique:** `assessmentid`, `strategy`, `dimensionid`

### workshop_submissions

*Info about the submission and the aggregation of the grade for submission, grade for assessment and final grade. Both grade for submission and grade for assessment can be overridden by teacher. Final grade is always the sum of them. All grades are stored as of 0-100.*

<sub>defined in `public/mod/workshop/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `workshopid` | bigint(10) | NO |  | MUL | the id of the workshop instance |
| 3 | `example` | tinyint(2) | YES | `0` |  | Is this submission an example from teacher |
| 4 | `authorid` | bigint(10) | NO |  | MUL | The author of the submission |
| 5 | `timecreated` | bigint(10) | NO |  |  | Timestamp when the work was submitted for the first time |
| 6 | `timemodified` | bigint(10) | NO |  |  | Timestamp when the submission has been updated |
| 7 | `title` | varchar(255) | NO | `''` |  | The submission title |
| 8 | `content` | longtext | YES | `NULL` |  | Submission text |
| 9 | `contentformat` | smallint(3) | NO | `0` |  | The format of submission text |
| 10 | `contenttrust` | smallint(3) | NO | `0` |  | The trust mode of the data |
| 11 | `attachment` | tinyint(2) | YES | `0` |  | Used by File API file_postupdate_standard_filemanager |
| 12 | `grade` | decimal(10,5) | YES | `NULL` |  | Aggregated grade for the submission. The grade is a decimal number from interval 0..100. If NULL then the grade for submission has not been aggregated yet. |
| 13 | `gradeover` | decimal(10,5) | YES | `NULL` |  | Grade for the submission manually overridden by a teacher. Grade is always from interval 0..100. If NULL then the grade is not overriden. |
| 14 | `gradeoverby` | bigint(10) | YES | `NULL` | MUL | The id of the user who has overridden the grade for submission. |
| 15 | `feedbackauthor` | longtext | YES | `NULL` |  | Teacher comment/feedback for the author of the submission, for example describing the reasons for the grade overriding |
| 16 | `feedbackauthorformat` | smallint(3) | YES | `0` |  |  |
| 17 | `timegraded` | bigint(10) | YES | `NULL` |  | The timestamp when grade or gradeover was recently modified |
| 18 | `published` | tinyint(2) | YES | `0` |  | Shall the submission be available to other when the workshop is closed |
| 19 | `late` | tinyint(2) | NO | `0` |  | Has this submission been submitted after the deadline or during the assessment phase? |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `workshopid` → `workshop`(`id`)
- **FK** `gradeoverby` → `user`(`id`)
- **FK** `authorid` → `user`(`id`)

### workshopallocation_scheduled

*Stores the allocation settings for the scheduled allocator*

<sub>defined in `public/mod/workshop/allocation/scheduled/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `workshopid` | bigint(10) | NO |  | UNI | workshop id we are part of |
| 3 | `enabled` | tinyint(2) | NO | `0` |  | Is the scheduled allocation enabled |
| 4 | `submissionend` | bigint(10) | NO |  |  | What was the workshop's submissionend when this record was created or modified |
| 5 | `timeallocated` | bigint(10) | YES | `NULL` |  | When was the last scheduled allocation executed |
| 6 | `settings` | longtext | YES | `NULL` |  | The pre-defined settings for the underlying random allocation to run it with |
| 7 | `resultstatus` | bigint(10) | YES | `NULL` |  | The resulting status of the most recent execution |
| 8 | `resultmessage` | varchar(1333) | YES | `NULL` |  | Optional short message describing the resulting status |
| 9 | `resultlog` | longtext | YES | `NULL` |  | The log of the most recent execution |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `workshopid` → `workshop`(`id`) *(unique)*

### workshopeval_best_settings

*Settings for the grading evaluation subplugin Comparison with the best assessment.*

<sub>defined in `public/mod/workshop/eval/best/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `workshopid` | bigint(10) | NO |  | UNI |  |
| 3 | `comparison` | smallint(3) | YES | `5` |  | Here we store the recently set factor of comparison of assessment in the given workshop. Reasonable values are from 1 to 10 or so. Default to 5. |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `workshopid` → `workshop`(`id`) *(unique)*

### workshopform_accumulative

*The assessment dimensions definitions of Accumulative grading strategy forms*

<sub>defined in `public/mod/workshop/form/accumulative/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `workshopid` | bigint(10) | NO |  | MUL | Workshop ID |
| 3 | `sort` | bigint(10) | YES | `0` |  | Defines the dimension order within the assessment form |
| 4 | `description` | longtext | YES | `NULL` |  | The description of the dimension |
| 5 | `descriptionformat` | smallint(3) | YES | `0` |  | The format of the description field |
| 6 | `grade` | bigint(10) | NO |  |  | If greater than 0, then the value is maximum grade on a scale 0..grade. If lesser than 0, then its absolute value is the id of a record in scale table. If equals 0, then no grading is possible for this dimension, just commenting. |
| 7 | `weight` | mediumint(5) | YES | `1` |  | The weigh of the dimension |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `workshopid` → `workshop`(`id`)

### workshopform_comments

*The assessment dimensions definitions of Comments strategy forms*

<sub>defined in `public/mod/workshop/form/comments/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `workshopid` | bigint(10) | NO |  | MUL | Workshop ID |
| 3 | `sort` | bigint(10) | YES | `0` |  | Defines the dimension order within the assessment form |
| 4 | `description` | longtext | YES | `NULL` |  | The description of the dimension |
| 5 | `descriptionformat` | smallint(3) | YES | `0` |  | The format of the description field |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `workshopid` → `workshop`(`id`)

### workshopform_numerrors

*The assessment dimensions definitions of Number of errors grading strategy forms*

<sub>defined in `public/mod/workshop/form/numerrors/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `workshopid` | bigint(10) | NO |  | MUL | Workshop ID |
| 3 | `sort` | bigint(10) | YES | `0` |  | Defines the dimension order within the assessment form |
| 4 | `description` | longtext | YES | `NULL` |  | The description of the dimension |
| 5 | `descriptionformat` | smallint(3) | YES | `0` |  | The format of the description field |
| 6 | `descriptiontrust` | bigint(10) | YES | `NULL` |  |  |
| 7 | `grade0` | varchar(50) | YES | `NULL` |  | The word describing the negative evaluation (like Poor, Missing, Absent, etc.). If NULL, it defaults to a translated string False |
| 8 | `grade1` | varchar(50) | YES | `NULL` |  | A word for possitive evaluation (like Good, Present, OK etc). If NULL, it defaults to a translated string True |
| 9 | `weight` | mediumint(5) | YES | `1` |  | Weight of this dimension |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `workshopid` → `workshop`(`id`)

### workshopform_numerrors_map

*This maps the number of errors to a percentual grade for submission*

<sub>defined in `public/mod/workshop/form/numerrors/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `workshopid` | bigint(10) | NO |  | MUL | The id of the workshop |
| 3 | `nonegative` | bigint(10) | NO |  |  | Number of negative responses given by the reviewer |
| 4 | `grade` | decimal(10,5) | NO |  |  | Percentual grade 0..100 for this number of negative responses |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `workshopid` → `workshop`(`id`)
- **Unique:** `workshopid`, `nonegative`

### workshopform_rubric

*The assessment dimensions definitions of Rubric grading strategy forms*

<sub>defined in `public/mod/workshop/form/rubric/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `workshopid` | bigint(10) | NO |  | MUL | Workshop ID |
| 3 | `sort` | bigint(10) | YES | `0` |  | Defines the dimension order within the assessment form |
| 4 | `description` | longtext | YES | `NULL` |  | The description of the dimension |
| 5 | `descriptionformat` | smallint(3) | YES | `0` |  | The format of the description field |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `workshopid` → `workshop`(`id`)

### workshopform_rubric_config

*Configuration table for the Rubric grading strategy*

<sub>defined in `public/mod/workshop/form/rubric/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `workshopid` | bigint(10) | NO |  | UNI | The id of workshop this configuartion applies for |
| 3 | `layout` | varchar(30) | YES | `'list'` |  | How should the rubric be displayed for reviewers |

**Keys & indexes**

- **Primary key:** `id`
- **Unique:** `workshopid`

### workshopform_rubric_levels

*The definition of rubric rating scales*

<sub>defined in `public/mod/workshop/form/rubric/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `dimensionid` | bigint(10) | NO |  | MUL | Which criterion this level is part of |
| 3 | `grade` | decimal(10,5) | NO |  |  | Grade representing this level. |
| 4 | `definition` | longtext | YES | `NULL` |  | The definition of this level |
| 5 | `definitionformat` | smallint(3) | YES | `0` |  | The format of the definition field |

**Keys & indexes**

- **Primary key:** `id`
- **FK** `dimensionid` → `workshopform_rubric`(`id`)

### xapi_states

*The stored xAPI states*

<sub>defined in `public/lib/db/install.xml`</sub>

| # | Column | Type | Null | Default | Key | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | bigint(10) | NO |  | PRI | (auto-increment) |
| 2 | `component` | varchar(255) | NO | `''` | MUL | The component name |
| 3 | `userid` | bigint(10) | YES | `NULL` | MUL |  |
| 4 | `itemid` | bigint(10) | NO |  |  | The Agent Id (usually the plugin instance) |
| 5 | `stateid` | varchar(255) | NO | `''` |  | Component identified for the state data |
| 6 | `statedata` | longtext | YES | `NULL` |  | JSON state data |
| 7 | `registration` | varchar(255) | YES | `NULL` |  | Optional registration identifier |
| 8 | `timecreated` | bigint(10) | NO |  |  |  |
| 9 | `timemodified` | bigint(10) | YES | `NULL` | MUL |  |

**Keys & indexes**

- **Primary key:** `id`
- **Index**: `component`, `itemid`
- **Index**: `userid`
- **Index**: `timemodified`

