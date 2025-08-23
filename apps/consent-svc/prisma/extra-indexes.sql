CREATE INDEX IF NOT EXISTS idx_consentrecord_subject ON 
"ConsentRecord"("subjectId"); 
CREATE INDEX IF NOT EXISTS idx_consentevent_subject_time ON 
"ConsentEvent"("subjectId","createdAt"); 
Middleware de cumplimiento para servicios 
consumidores (SDK ligero) 
