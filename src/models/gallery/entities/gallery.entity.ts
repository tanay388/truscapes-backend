import { BaseClassEntity } from 'src/common/entities/base.extend-entity';
import { Entity, Column } from 'typeorm';

@Entity('galleries')
export class Gallery extends BaseClassEntity {
  @Column({ type: 'varchar', nullable: false })
  imageName: string; // Name of the uploaded image

  @Column({ type: 'text', nullable: false })
  imageUrl: string; // URL of the uploaded image
}
