"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AttachmentInput as SeedAttachmentInput, Icon } from "@seed-design/react";
import type { FileEntry, FileStatusDetails } from "@seed-design/react/primitive";
import {
  IconArrowClockwiseCircularFill,
  IconXmarkFill,
} from "@karrotmarket/react-monochrome-icon";
import { AttachmentField, AttachmentInput } from "seed-design/ui/attachment-field";
import { ProgressCircle } from "seed-design/ui/progress-circle";

import { MAX_SOURCE_BYTES, PHOTO_ACCEPT, describePhotoError, processPhotoFile } from "@/lib/image";

// 커뮤니티 글쓰기의 사진 칸
// 고른 순간 정사각 썸네일이 가로로 쌓이고 맨 앞 칸이 추가 버튼이라 몇 장을 더 넣을 수 있는지 한눈에 보임
// 빈 자리를 크게 비워 두지 않아 시트 안에서 제목과 내용이 먼저 눈에 들어옴

/** 첫 장이 카드 대표 사진이 되므로 그 자리를 배지로 알려 줌 */
const COVER_LABEL = "대표";

const ERROR_MESSAGE: Record<string, string> = {
  TOO_MANY_FILES: "고를 수 있는 장수를 넘었어요",
  INVALID_TYPE: "이미지 파일만 올릴 수 있어요",
  FILE_TOO_LARGE: "25MB 이하의 사진만 올릴 수 있어요",
};

function describeReject(errors: string[]): string {
  for (const code of errors) {
    const message = ERROR_MESSAGE[code];
    if (message) return message;
  }
  return "사진을 올리지 못했어요";
}

export type PostPhotoFieldProps = {
  maxFiles: number;
  /** 올리기가 끝난 사진의 참조. 고른 순서를 지킴 */
  onUploadIdsChange: (ids: string[]) => void;
  /** 아직 올리는 중인 장이 있는지. 저장 버튼을 잠그는 기준 */
  onUploadingChange: (uploading: boolean) => void;
};

export function PostPhotoField({
  maxFiles,
  onUploadIdsChange,
  onUploadingChange,
}: PostPhotoFieldProps) {
  const [errorMessage, setErrorMessage] = useState<string>();
  // 목록은 SEED 가 들고 있음
  // 이 값을 prop 으로 되돌려 주면 updateFileEntryStatus 가 갱신 전 배열 위에서 돌아
  // 방금 담은 항목을 지운 채 덮어씀. 상태 바꾸기와 목록 소유가 한곳에 있어야 함
  const [count, setCount] = useState(0);

  // 항목 id 로 올리기 결과를 묶음. 목록에서 빠지면 참조도 함께 버림
  const uploadIds = useRef<Map<string, string>>(new Map());
  // 마지막 목록. 올리기가 끝난 뒤에도 같은 순서로 참조를 다시 낼 수 있어야 함
  const entriesRef = useRef<FileEntry[]>([]);
  // 개발 모드의 이중 마운트에서 정리가 먼저 돌아 false 로 남으면
  // 그 뒤 도착한 업로드 응답을 전부 버림. 붙을 때마다 다시 켬
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // 렌더 중에 부모 상태를 건드리지 않도록 목록이 바뀐 뒤에 알림
  // 올리기 응답은 목록 변경과 따로 도착하므로 그때도 다시 부름
  const report = useCallback(() => {
    const entries = entriesRef.current;
    onUploadIdsChange(
      entries.flatMap((entry) => {
        const id = uploadIds.current.get(entry.id);
        return id ? [id] : [];
      }),
    );
    onUploadingChange(entries.some((entry) => entry.status === "uploading"));
  }, [onUploadIdsChange, onUploadingChange]);

  const upload = useCallback(
    async (
      entry: FileEntry,
      updateFileEntryStatus: (id: string, details: FileStatusDetails) => void,
    ) => {
      updateFileEntryStatus(entry.id, { status: "uploading" });
      try {
        // 캔버스로 다시 인코딩해 EXIF 의 GPS 를 지우고 용량을 줄임
        const processed = await processPhotoFile(entry.file);
        const body = new FormData();
        body.append("photo", processed.file);

        const response = await fetch("/api/draft/uploads", { method: "POST", body });
        const payload = (await response.json()) as { uploadId?: string; message?: string };
        if (!alive.current) return;

        if (!response.ok || !payload.uploadId) {
          setErrorMessage(payload.message ?? "사진을 올리지 못했어요");
          updateFileEntryStatus(entry.id, { status: "error" });
          return;
        }

        uploadIds.current.set(entry.id, payload.uploadId);
        updateFileEntryStatus(entry.id, { status: "success" });
        // 참조가 늘었으니 목록이 그대로여도 부모에 다시 알림
        report();
      } catch (cause) {
        if (!alive.current) return;
        setErrorMessage(describePhotoError(cause));
        updateFileEntryStatus(entry.id, { status: "error" });
      }
    },
    [report],
  );

  return (
    <AttachmentField
      accept={PHOTO_ACCEPT}
      maxFiles={maxFiles}
      maxFileSize={MAX_SOURCE_BYTES}
      label="사진"
      labelWeight="bold"
      indicator={`${count}/${maxFiles}`}
      invalid={Boolean(errorMessage)}
      errorMessage={errorMessage}
      onAcceptedFileEntriesChange={(entries) => {
        entriesRef.current = entries;
        setCount(entries.length);
        report();
      }}
      onFileAccept={(accepted, { updateFileEntryStatus }) => {
        setErrorMessage(undefined);
        // 담긴 목록이 반영된 뒤에 상태를 바꿔야 방금 담은 항목이 남음
        queueMicrotask(() => {
          for (const entry of accepted) void upload(entry, updateFileEntryStatus);
        });
      }}
      onFileReject={(rejected) => {
        const [first] = rejected;
        if (first) setErrorMessage(describeReject(first.errors));
      }}
    >
      <AttachmentInput>
        {({ acceptedFileEntries, updateFileEntryStatus }) =>
          acceptedFileEntries.map((entry, index) => (
            <SeedAttachmentInput.Item key={entry.id} fileEntry={entry}>
              <SeedAttachmentInput.ItemImage />
              {/* 목록 카드가 첫 장만 쓰므로 어느 것이 대표인지 보여 줌 */}
              {index === 0 ? (
                <SeedAttachmentInput.ItemBadge>{COVER_LABEL}</SeedAttachmentInput.ItemBadge>
              ) : null}
              <SeedAttachmentInput.ItemBackdrop status="uploading">
                <ProgressCircle size="24" tone="staticWhite" />
              </SeedAttachmentInput.ItemBackdrop>
              <SeedAttachmentInput.ItemBackdrop status="error">
                <SeedAttachmentInput.ItemActionButton
                  onClick={() => void upload(entry, updateFileEntryStatus)}
                >
                  <Icon svg={<IconArrowClockwiseCircularFill />} />
                  재시도
                </SeedAttachmentInput.ItemActionButton>
              </SeedAttachmentInput.ItemBackdrop>
              <SeedAttachmentInput.ItemRemoveButton aria-label={`사진 ${index + 1} 삭제`}>
                <Icon svg={<IconXmarkFill />} />
              </SeedAttachmentInput.ItemRemoveButton>
            </SeedAttachmentInput.Item>
          ))
        }
      </AttachmentInput>
    </AttachmentField>
  );
}
